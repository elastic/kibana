/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { keyBy, memoize, partition } from 'lodash';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { TransformStats } from '../../../../common/types/transform_stats';
import { TRANSFORM_HEALTH_STATUS } from '../../../../common/constants';
import type { TransformHealthRuleParams } from './schema';
import {
  mapEsHealthStatus2TransformHealthStatus,
  ALL_TRANSFORMS_SELECTION,
  TRANSFORM_HEALTH_CHECK_NAMES,
  TRANSFORM_NOTIFICATIONS_INDEX,
  TRANSFORM_RULE_TYPE,
  TRANSFORM_STATE,
} from '../../../../common/constants';
import { getResultTestConfig } from '../../../../common/utils/alerts';
import type {
  ErrorMessagesTransformResponse,
  TransformStateReportResponse,
  TransformHealthAlertContext,
} from './register_transform_health_rule_type';
import type { TransformHealthAlertRule } from '../../../../common/types/alerting';
import { isContinuousTransform } from '../../../../common/types/transform';

interface TestResult {
  isHealthy: boolean;
  name: string;
  context: TransformHealthAlertContext;
}

type Transform = estypes.TransformGetTransformTransformSummary & {
  id: string;
  description?: string;
  sync: object;
};

type TransformWithAlertingRules = Transform & { alerting_rules: TransformHealthAlertRule[] };

export function transformHealthServiceProvider({
  esClient,
  rulesClient,
  fieldFormatsRegistry,
}: {
  esClient: ElasticsearchClient;
  rulesClient?: RulesClient;
  fieldFormatsRegistry?: FieldFormatsRegistry;
}) {
  const transformsDict = new Map<string, Transform>();

  /**
   * Resolves result transform selection.
   * @param includeTransforms
   * @param excludeTransforms
   * @param skipIDsCheck
   */
  const getResultsTransformIds = async (
    includeTransforms: string[],
    excludeTransforms: string[] | null,
    skipIDsCheck = false
  ): Promise<string[]> => {
    const includeAll = includeTransforms.some((id) => id === ALL_TRANSFORMS_SELECTION);

    let resultTransformIds: string[] = [];

    if (skipIDsCheck) {
      resultTransformIds = includeTransforms;
    } else {
      // Fetch transforms to make sure assigned transforms exists.
      const transformsResponse = (
        await esClient.transform.getTransform({
          ...(includeAll ? {} : { transform_id: includeTransforms.join(',') }),
          allow_no_match: true,
          size: 1000,
        })
      ).transforms as Transform[];

      transformsResponse.forEach((t) => {
        transformsDict.set(t.id, t);
        if (t.sync) {
          resultTransformIds.push(t.id);
        }
      });
    }

    if (excludeTransforms && excludeTransforms.length > 0) {
      const excludeIdsSet = new Set(excludeTransforms);
      resultTransformIds = resultTransformIds.filter((id) => !excludeIdsSet.has(id));
    }

    return resultTransformIds;
  };

  const getTransformStats = memoize(async (transformIds: string[]): Promise<TransformStats[]> => {
    return (
      await esClient.transform.getTransformStats({
        transform_id: transformIds.join(','),
      })
    ).transforms as TransformStats[];
  });

  function baseTransformAlertResponseFormatter(
    transformStats: TransformStats
  ): TransformStateReportResponse {
    const dateFormatter = fieldFormatsRegistry!.deserialize({ id: FIELD_FORMAT_IDS.DATE });

    return {
      transform_id: transformStats.id,
      description: transformsDict.get(transformStats.id)?.description,
      transform_state: transformStats.state,
      node_name: transformStats.node?.name,
      health_status: mapEsHealthStatus2TransformHealthStatus(transformStats.health?.status),
      ...(transformStats.health?.issues
        ? {
            issues: transformStats.health.issues.map((issue) => {
              return {
                issue: issue.issue,
                details: issue.details,
                count: issue.count,
                ...(issue.first_occurrence
                  ? { first_occurrence: dateFormatter.convert(issue.first_occurrence) }
                  : {}),
              };
            }),
          }
        : {}),
    };
  }

  return {
    /**
     * Returns report about not started transforms
     * @param transformIds
     *
     * @return - Partitions with not started and started transforms
     */
    async getTransformsStateReport(
      transformIds: string[]
    ): Promise<[TransformStateReportResponse[], TransformStateReportResponse[]]> {
      const transformsStats = await getTransformStats(transformIds);

      return partition(
        transformsStats.map(baseTransformAlertResponseFormatter),
        (t) =>
          t.transform_state !== TRANSFORM_STATE.STARTED &&
          t.transform_state !== TRANSFORM_STATE.INDEXING
      );
    },
    /**
     * Returns report about transforms that contain error messages
     * @deprecated This health check is no longer in use
     * @param transformIds
     */
    async getErrorMessagesReport(
      transformIds: string[]
    ): Promise<ErrorMessagesTransformResponse[]> {
      interface TransformErrorsBucket {
        key: string;
        doc_count: number;
        error_messages: estypes.AggregationsTopHitsAggregate;
      }

      const response = await esClient.search<
        unknown,
        Record<'by_transform', estypes.AggregationsMultiBucketAggregateBase<TransformErrorsBucket>>
      >({
        index: TRANSFORM_NOTIFICATIONS_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  level: 'error',
                },
              },
              {
                terms: {
                  transform_id: transformIds,
                },
              },
            ],
          },
        },
        aggs: {
          by_transform: {
            terms: {
              field: 'transform_id',
              size: transformIds.length,
            },
            aggs: {
              error_messages: {
                top_hits: {
                  size: 10,
                  _source: {
                    includes: ['message', 'level', 'timestamp', 'node_name'],
                  },
                },
              },
            },
          },
        },
      });

      // If transform contains errors, it's in a failed state
      const transformsStats = (
        await esClient.transform.getTransformStats({
          transform_id: transformIds.join(','),
        })
      ).transforms;
      const failedTransforms = new Set(
        transformsStats.filter((t) => t.state === TRANSFORM_STATE.FAILED).map((t) => t.id)
      );

      return (response.aggregations?.by_transform.buckets as TransformErrorsBucket[])
        .map(({ key, error_messages: errorMessages }) => {
          return {
            transform_id: key,
            error_messages: errorMessages.hits.hits.map((v) => v._source),
          } as ErrorMessagesTransformResponse;
        })
        .filter((v) => failedTransforms.has(v.transform_id));
    },
    /**
     * Returns report about unhealthy transforms
     * @param transformIds
     */
    async getUnhealthyTransformsReport(
      transformIds: string[]
    ): Promise<TransformStateReportResponse[]> {
      const transformsStats = await getTransformStats(transformIds);

      return transformsStats
        .filter((t) => t.health?.status !== TRANSFORM_HEALTH_STATUS.green)
        .map(baseTransformAlertResponseFormatter);
    },
    /**
     * Returns results of the transform health checks
     * @param params
     */
    async getHealthChecksResults(params: TransformHealthRuleParams) {
      const transformIds = await getResultsTransformIds(
        params.includeTransforms,
        params.excludeTransforms
      );

      const testsConfig = getResultTestConfig(params.testsConfig);

      const result: TestResult[] = [];

      if (testsConfig.notStarted.enabled) {
        const [notStartedTransform, startedTransforms] = await this.getTransformsStateReport(
          transformIds
        );

        const isHealthy = notStartedTransform.length === 0;

        const count = isHealthy ? startedTransforms.length : notStartedTransform.length;
        const transformsString = (isHealthy ? startedTransforms : notStartedTransform)
          .map((t) => t.transform_id)
          .join(', ');

        result.push({
          isHealthy,
          name: TRANSFORM_HEALTH_CHECK_NAMES.notStarted.name,
          context: {
            results: isHealthy ? startedTransforms : notStartedTransform,
            message: isHealthy
              ? i18n.translate(
                  'xpack.transform.alertTypes.transformHealth.notStartedRecoveryMessage',
                  {
                    defaultMessage:
                      '{count, plural, one {Transform} other {Transform}} {transformsString} {count, plural, one {is} other {are}} started.',
                    values: { count, transformsString },
                  }
                )
              : i18n.translate('xpack.transform.alertTypes.transformHealth.notStartedMessage', {
                  defaultMessage:
                    '{count, plural, one {Transform} other {Transform}} {transformsString} {count, plural, one {is} other {are}} not started.',
                  values: { count, transformsString },
                }),
          },
        });
      }

      if (testsConfig.errorMessages.enabled) {
        const response = await this.getErrorMessagesReport(transformIds);

        const isHealthy = response.length === 0;
        const count = response.length;
        const transformsString = response.map((t) => t.transform_id).join(', ');

        result.push({
          isHealthy,
          name: TRANSFORM_HEALTH_CHECK_NAMES.errorMessages.name,
          context: {
            results: isHealthy ? [] : response,
            message: isHealthy
              ? i18n.translate(
                  'xpack.transform.alertTypes.transformHealth.errorMessagesRecoveryMessage',
                  {
                    defaultMessage:
                      'No errors in the {count, plural, one {transform} other {transforms}} messages.',
                    values: { count: transformIds.length },
                  }
                )
              : i18n.translate('xpack.transform.alertTypes.transformHealth.errorMessagesMessage', {
                  defaultMessage:
                    '{count, plural, one {Transform} other {Transforms}} {transformsString} {count, plural, one {contains} other {contain}} error messages.',
                  values: { count, transformsString },
                }),
          },
        });
      }

      if (testsConfig.healthCheck.enabled) {
        const response = await this.getUnhealthyTransformsReport(transformIds);
        const isHealthy = response.length === 0;
        const count = response.length;
        const transformsString = response.map((t) => t.transform_id).join(', ');
        result.push({
          isHealthy,
          name: TRANSFORM_HEALTH_CHECK_NAMES.healthCheck.name,
          context: {
            results: isHealthy ? [] : response,
            message: isHealthy
              ? i18n.translate(
                  'xpack.transform.alertTypes.transformHealth.healthCheckRecoveryMessage',
                  {
                    defaultMessage:
                      '{count, plural, one {Transform} other {Transforms}} {transformsString} {count, plural, one {is} other {are}} healthy.',
                    values: { count, transformsString },
                  }
                )
              : i18n.translate('xpack.transform.alertTypes.transformHealth.healthCheckMessage', {
                  defaultMessage:
                    '{count, plural, one {Transform} other {Transforms}} {transformsString} {count, plural, one {is} other {are}} unhealthy.',
                  values: { count, transformsString },
                }),
          },
        });
      }

      return result;
    },

    /**
     * Updates transform list with associated alerting rules.
     */
    async populateTransformsWithAssignedRules(
      transforms: Transform[]
    ): Promise<TransformWithAlertingRules[]> {
      const newList = transforms.filter(isContinuousTransform) as TransformWithAlertingRules[];

      if (!rulesClient) {
        throw new Error('Rules client is missing');
      }

      const transformMap = keyBy(newList, 'id');

      const transformAlertingRules = await rulesClient.find<TransformHealthRuleParams>({
        options: {
          perPage: 1000,
          filter: `alert.attributes.alertTypeId:${TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH}`,
        },
      });

      for (const ruleInstance of transformAlertingRules.data) {
        // Retrieve result transform IDs
        const resultTransformIds: string[] = await getResultsTransformIds(
          ruleInstance.params.includeTransforms.includes(ALL_TRANSFORMS_SELECTION)
            ? Object.keys(transformMap)
            : ruleInstance.params.includeTransforms,
          ruleInstance.params.excludeTransforms,
          true
        );

        resultTransformIds.forEach((transformId) => {
          const transformRef = transformMap[transformId] as TransformWithAlertingRules;

          if (transformRef) {
            if (Array.isArray(transformRef.alerting_rules)) {
              transformRef.alerting_rules.push(ruleInstance);
            } else {
              transformRef.alerting_rules = [ruleInstance];
            }
          }
        });
      }

      return newList;
    },
  };
}

export type TransformHealthService = ReturnType<typeof transformHealthServiceProvider>;
