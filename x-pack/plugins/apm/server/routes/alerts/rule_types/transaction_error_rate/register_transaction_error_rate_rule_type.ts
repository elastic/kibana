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
import { asPercent } from '@kbn/observability-plugin/common/utils/formatters';
import { termQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { firstValueFrom } from 'rxjs';
import { SearchAggregatedTransactionSetting } from '../../../../../common/aggregated_transactions';
import {
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import {
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../../common/event_outcome';
import {
  ApmRuleType,
  APM_SERVER_FEATURE_ID,
  formatTransactionErrorRateReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { transactionErrorRateParamsSchema } from '../../../../../common/rules/schema';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import {
  asDecimalOrInteger,
  getAlertUrlTransaction,
} from '../../../../../common/utils/formatters';
import { getDocumentTypeFilterForTransactions } from '../../../../lib/helpers/transactions';
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
import { getGroupByTerms } from '../../../../../common/utils/get_groupby_terms';
import { getGroupByActionVariables } from '../get_group_action_variables';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionErrorRate];

export function registerTransactionErrorRateRuleType({
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
      id: ApmRuleType.TransactionErrorRate,
      name: ruleTypeConfig.name,
      actionGroups: ruleTypeConfig.actionGroups,
      defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
      validate: { params: transactionErrorRateParamsSchema },
      actionVariables: {
        context: [
          apmActionVariables.environment,
          apmActionVariables.interval,
          apmActionVariables.reason,
          apmActionVariables.serviceName,
          apmActionVariables.threshold,
          apmActionVariables.transactionType,
          apmActionVariables.transactionName,
          apmActionVariables.triggerValue,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ services, spaceId, params: ruleParams }) => {
        const predefinedGroupby: string[] = [
          SERVICE_NAME,
          SERVICE_ENVIRONMENT,
          TRANSACTION_TYPE,
        ];

        const allGroupbyFields: string[] =
          ruleParams.groupBy ?? predefinedGroupby;

        const config = await firstValueFrom(config$);

        const { savedObjectsClient, scopedClusterClient } = services;

        const indices = await getApmIndices({
          config,
          savedObjectsClient,
        });

        // only query transaction events when set to 'never',
        // to prevent (likely) unnecessary blocking request
        // in rule execution
        const searchAggregatedTransactions =
          config.searchAggregatedTransactions !==
          SearchAggregatedTransactionSetting.never;

        const index = searchAggregatedTransactions
          ? indices.metric
          : indices.transaction;

        const searchParams = {
          index,
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
                  ...getDocumentTypeFilterForTransactions(
                    searchAggregatedTransactions
                  ),
                  {
                    terms: {
                      [EVENT_OUTCOME]: [
                        EventOutcome.failure,
                        EventOutcome.success,
                      ],
                    },
                  },
                  ...termQuery(SERVICE_NAME, ruleParams.serviceName),
                  ...termQuery(TRANSACTION_TYPE, ruleParams.transactionType),
                  ...environmentQuery(ruleParams.environment),
                ],
              },
            },
            aggs: {
              series: {
                multi_terms: {
                  terms: [...getGroupByTerms(allGroupbyFields)],
                  size: 1000,
                  order: { _count: 'desc' as const },
                },
                aggs: {
                  outcomes: {
                    terms: {
                      field: EVENT_OUTCOME,
                    },
                    aggs: getServiceGroupFieldsAgg(),
                  },
                },
              },
            },
          },
        };

        const response = await alertingEsClient({
          scopedClusterClient,
          params: searchParams,
        });

        if (!response.aggregations) {
          return { state: {} };
        }

        const results = [];

        for (const bucket of response.aggregations.series.buckets) {
          const groupByFields: Record<string, string> = {};
          bucket.key.forEach((key, keyIndex) => {
            if (!predefinedGroupby.includes(allGroupbyFields[keyIndex])) {
              groupByFields[allGroupbyFields[keyIndex]] = key;
            }
          });

          const [serviceName, environment, transactionType] = bucket.key;

          const bucketKey = bucket.key;

          const failedOutcomeBucket = bucket.outcomes.buckets.find(
            (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
          );
          const failed = failedOutcomeBucket?.doc_count ?? 0;
          const succesful =
            bucket.outcomes.buckets.find(
              (outcomeBucket) => outcomeBucket.key === EventOutcome.success
            )?.doc_count ?? 0;
          const errorRate = (failed / (failed + succesful)) * 100;

          if (errorRate >= ruleParams.threshold) {
            results.push({
              serviceName,
              environment,
              transactionType,
              errorRate,
              sourceFields: getServiceGroupFields(failedOutcomeBucket),
              groupByFields,
              bucketKey,
            });
          }
        }

        results.forEach((result) => {
          const {
            serviceName,
            environment,
            transactionType,
            errorRate,
            sourceFields,
            groupByFields,
            bucketKey,
          } = result;

          const reasonMessage = formatTransactionErrorRateReason({
            threshold: ruleParams.threshold,
            measured: errorRate,
            asPercent,
            serviceName,
            windowSize: ruleParams.windowSize,
            windowUnit: ruleParams.windowUnit,
            group: bucketKey
              .filter((key) => !key.includes('NOT_DEFINED'))
              .join(', '),
          });

          const relativeViewInAppUrl = getAlertUrlTransaction(
            serviceName,
            getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT],
            transactionType
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
                [SERVICE_NAME]: serviceName,
                ...getEnvironmentEsField(environment),
                [TRANSACTION_TYPE]: transactionType,
                [PROCESSOR_EVENT]: ProcessorEvent.transaction,
                [ALERT_EVALUATION_VALUE]: errorRate,
                [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                [ALERT_REASON]: reasonMessage,
                ...sourceFields,
                ...groupByFields,
              },
            })
            .scheduleActions(ruleTypeConfig.defaultActionGroupId, {
              environment: getEnvironmentLabel(environment),
              interval: formatDurationFromTimeUnitChar(
                ruleParams.windowSize,
                ruleParams.windowUnit as TimeUnitChar
              ),
              reason: reasonMessage,
              serviceName,
              threshold: ruleParams.threshold,
              transactionType,
              triggerValue: asDecimalOrInteger(errorRate),
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
