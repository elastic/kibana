/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import {
  formatDurationFromTimeUnitChar,
  getAlertUrl,
  observabilityPaths,
  ProcessorEvent,
  TimeUnitChar,
} from '@kbn/observability-plugin/common';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ApmRuleType,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import {
  getParsedFilterQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { asyncForEach } from '@kbn/std';
import { getEnvironmentEsField } from '../../../../../common/environment_filter_values';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/es_fields/apm';
import {
  APM_SERVER_FEATURE_ID,
  formatErrorCountReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { errorCountParamsSchema } from '../../../../../common/rules/schema';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getAlertUrlErrorCount } from '../../../../../common/utils/formatters';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import {
  ApmRuleTypeAlertDefinition,
  RegisterRuleDependencies,
} from '../../register_apm_rule_types';
import {
  getServiceGroupFields,
  getServiceGroupFieldsAgg,
} from '../get_service_group_fields';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getGroupByActionVariables } from '../utils/get_groupby_action_variables';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.ErrorCount];

export const errorCountActionVariables = [
  apmActionVariables.alertDetailsUrl,
  apmActionVariables.environment,
  apmActionVariables.errorGroupingKey,
  apmActionVariables.errorGroupingName,
  apmActionVariables.interval,
  apmActionVariables.reason,
  apmActionVariables.serviceName,
  apmActionVariables.threshold,
  apmActionVariables.transactionName,
  apmActionVariables.triggerValue,
  apmActionVariables.viewInAppUrl,
];

export function registerErrorCountRuleType({
  alerting,
  alertsLocator,
  basePath,
  getApmIndices,
  logger,
  ruleDataClient,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: ApmRuleType.ErrorCount,
      name: ruleTypeConfig.name,
      actionGroups: ruleTypeConfig.actionGroups,
      defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
      validate: { params: errorCountParamsSchema },
      actionVariables: {
        context: errorCountActionVariables,
      },
      category: DEFAULT_APP_CATEGORIES.observability.id,
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({
        params: ruleParams,
        services,
        spaceId,
        startedAt,
        getTimeRange,
      }) => {
        const allGroupByFields = getAllGroupByFields(
          ApmRuleType.ErrorCount,
          ruleParams.groupBy
        );

        const {
          getAlertUuid,
          getAlertStartedDate,
          savedObjectsClient,
          scopedClusterClient,
        } = services;

        const indices = await getApmIndices(savedObjectsClient);

        const termFilterQuery = !ruleParams.searchConfiguration?.query?.query
          ? [
              ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
                queryEmptyString: false,
              }),
              ...termQuery(ERROR_GROUP_ID, ruleParams.errorGroupingKey, {
                queryEmptyString: false,
              }),
              ...environmentQuery(ruleParams.environment),
            ]
          : [];

        const { dateStart } = getTimeRange(
          `${ruleParams.windowSize}${ruleParams.windowUnit}`
        );

        const searchParams = {
          index: indices.error,
          body: {
            track_total_hits: false,
            size: 0,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: dateStart,
                      },
                    },
                  },
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                  ...termFilterQuery,
                  ...getParsedFilterQuery(
                    ruleParams.searchConfiguration?.query?.query as string
                  ),
                ],
              },
            },
            aggs: {
              error_counts: {
                multi_terms: {
                  terms: getGroupByTerms(allGroupByFields),
                  size: 1000,
                  order: { _count: 'desc' as const },
                },
                aggs: getServiceGroupFieldsAgg(),
              },
            },
          },
        };

        const response = await alertingEsClient({
          scopedClusterClient,
          params: searchParams,
        });

        const errorCountResults =
          response.aggregations?.error_counts.buckets.map((bucket) => {
            const groupByFields = bucket.key.reduce(
              (obj, bucketKey, bucketIndex) => {
                obj[allGroupByFields[bucketIndex]] = bucketKey;
                return obj;
              },
              {} as Record<string, string>
            );

            const bucketKey = bucket.key;

            return {
              errorCount: bucket.doc_count,
              sourceFields: getServiceGroupFields(bucket),
              groupByFields,
              bucketKey,
            };
          }) ?? [];

        await asyncForEach(
          errorCountResults.filter(
            (result) => result.errorCount >= ruleParams.threshold
          ),
          async (result) => {
            const { errorCount, sourceFields, groupByFields, bucketKey } =
              result;
            const alertId = bucketKey.join('_');
            const alertReason = formatErrorCountReason({
              threshold: ruleParams.threshold,
              measured: errorCount,
              windowSize: ruleParams.windowSize,
              windowUnit: ruleParams.windowUnit,
              groupByFields,
            });

            const alert = services.alertWithLifecycle({
              id: alertId,
              fields: {
                [PROCESSOR_EVENT]: ProcessorEvent.error,
                [ALERT_EVALUATION_VALUE]: errorCount,
                [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                [ERROR_GROUP_ID]: ruleParams.errorGroupingKey,
                [ALERT_REASON]: alertReason,
                ...sourceFields,
                ...groupByFields,
              },
            });

            const relativeViewInAppUrl = getAlertUrlErrorCount(
              groupByFields[SERVICE_NAME],
              getEnvironmentEsField(groupByFields[SERVICE_ENVIRONMENT])?.[
                SERVICE_ENVIRONMENT
              ]
            );
            const viewInAppUrl = addSpaceIdToPath(
              basePath.publicBaseUrl,
              spaceId,
              relativeViewInAppUrl
            );
            const indexedStartedAt =
              getAlertStartedDate(alertId) ?? startedAt.toISOString();
            const alertUuid = getAlertUuid(alertId);
            const alertDetailsUrl = await getAlertUrl(
              alertUuid,
              spaceId,
              indexedStartedAt,
              alertsLocator,
              basePath.publicBaseUrl
            );
            const groupByActionVariables =
              getGroupByActionVariables(groupByFields);

            alert.scheduleActions(ruleTypeConfig.defaultActionGroupId, {
              alertDetailsUrl,
              interval: formatDurationFromTimeUnitChar(
                ruleParams.windowSize,
                ruleParams.windowUnit as TimeUnitChar
              ),
              reason: alertReason,
              threshold: ruleParams.threshold,
              // When group by doesn't include error.grouping_key, the context.error.grouping_key action variable will contain value of the Error Grouping Key filter
              errorGroupingKey: ruleParams.errorGroupingKey,
              triggerValue: errorCount,
              viewInAppUrl,
              ...groupByActionVariables,
            });
          }
        );

        return { state: {} };
      },
      alerts: ApmRuleTypeAlertDefinition,
      getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
        observabilityPaths.ruleDetails(rule.id),
    })
  );
}
