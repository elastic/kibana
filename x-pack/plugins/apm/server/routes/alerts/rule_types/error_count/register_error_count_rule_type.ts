/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatDurationFromTimeUnitChar,
  ProcessorEvent,
  TimeUnitChar,
} from '@kbn/observability-plugin/common';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { termQuery } from '@kbn/observability-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { firstValueFrom } from 'rxjs';
import { getEnvironmentEsField } from '../../../../../common/environment_filter_values';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/es_fields/apm';
import {
  ApmRuleType,
  APM_SERVER_FEATURE_ID,
  formatErrorCountReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { errorCountParamsSchema } from '../../../../../common/rules/schema';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getAlertUrlErrorCount } from '../../../../../common/utils/formatters';
import { getApmIndices } from '../../../settings/apm_indices/get_apm_indices';
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

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.ErrorCount];

export function registerErrorCountRuleType({
  alerting,
  basePath,
  config$,
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
        context: [
          apmActionVariables.environment,
          apmActionVariables.interval,
          apmActionVariables.reason,
          apmActionVariables.serviceName,
          apmActionVariables.transactionName,
          apmActionVariables.errorGroupingKey,
          apmActionVariables.threshold,
          apmActionVariables.triggerValue,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ params: ruleParams, services, spaceId }) => {
        const predefinedGroupby = [SERVICE_NAME, SERVICE_ENVIRONMENT];

        const allGroupbyFields = Array.from(
          new Set([...predefinedGroupby, ...(ruleParams.groupBy ?? [])])
        );

        const config = await firstValueFrom(config$);

        const { savedObjectsClient, scopedClusterClient } = services;

        const indices = await getApmIndices({
          config,
          savedObjectsClient,
        });

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
                        gte: `now-${ruleParams.windowSize}${ruleParams.windowUnit}`,
                      },
                    },
                  },
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                  ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
                    queryEmptyString: false,
                  }),
                  ...termQuery(ERROR_GROUP_ID, ruleParams.errorGroupingKey, {
                    queryEmptyString: false,
                  }),
                  ...environmentQuery(ruleParams.environment),
                ],
              },
            },
            aggs: {
              error_counts: {
                multi_terms: {
                  terms: getGroupByTerms(allGroupbyFields),
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
                obj[allGroupbyFields[bucketIndex]] = bucketKey;
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

        errorCountResults
          .filter((result) => result.errorCount >= ruleParams.threshold)
          .forEach((result) => {
            const { errorCount, sourceFields, groupByFields, bucketKey } =
              result;
            const alertReason = formatErrorCountReason({
              threshold: ruleParams.threshold,
              measured: errorCount,
              windowSize: ruleParams.windowSize,
              windowUnit: ruleParams.windowUnit,
              groupByFields,
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

            const groupByActionVariables =
              getGroupByActionVariables(groupByFields);

            services
              .alertWithLifecycle({
                id: bucketKey.join('_'),
                fields: {
                  [PROCESSOR_EVENT]: ProcessorEvent.error,
                  [ALERT_EVALUATION_VALUE]: errorCount,
                  [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                  [ERROR_GROUP_ID]: ruleParams.errorGroupingKey,
                  [ALERT_REASON]: alertReason,
                  ...sourceFields,
                  ...groupByFields,
                },
              })
              .scheduleActions(ruleTypeConfig.defaultActionGroupId, {
                interval: formatDurationFromTimeUnitChar(
                  ruleParams.windowSize,
                  ruleParams.windowUnit as TimeUnitChar
                ),
                reason: alertReason,
                threshold: ruleParams.threshold,
                errorGroupingKey: ruleParams.errorGroupingKey, // When group by doesn't include error.grouping_key, the context.error.grouping_key action variable will contain value of the Error Grouping Key filter
                triggerValue: errorCount,
                viewInAppUrl,
                ...groupByActionVariables,
              });
          });

        return { state: {} };
      },
      alerts: ApmRuleTypeAlertDefinition,
    })
  );
}
