/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import {
  formatDurationFromTimeUnitChar,
  getAlertUrl,
  observabilityPaths,
  ProcessorEvent,
  TimeUnitChar,
} from '@kbn/observability-plugin/common';
import { asPercent } from '@kbn/observability-plugin/common/utils/formatters';
import {
  getParsedFilterQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { asyncForEach } from '@kbn/std';
import { firstValueFrom } from 'rxjs';
import { SearchAggregatedTransactionSetting } from '../../../../../common/aggregated_transactions';
import { getEnvironmentEsField } from '../../../../../common/environment_filter_values';
import {
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
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
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getGroupByActionVariables } from '../utils/get_groupby_action_variables';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionErrorRate];

export function registerTransactionErrorRateRuleType({
  alerting,
  alertsLocator,
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
          apmActionVariables.alertDetailsUrl,
          apmActionVariables.environment,
          apmActionVariables.interval,
          apmActionVariables.reason,
          apmActionVariables.serviceName,
          apmActionVariables.transactionName,
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
      executor: async ({
        services,
        spaceId,
        params: ruleParams,
        startedAt,
      }) => {
        const allGroupByFields = getAllGroupByFields(
          ApmRuleType.TransactionErrorRate,
          ruleParams.groupBy
        );

        const config = await firstValueFrom(config$);

        const {
          getAlertUuid,
          getAlertStartedDate,
          savedObjectsClient,
          scopedClusterClient,
        } = services;

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

        const termFilterQuery = !ruleParams.kqlFilter
          ? [
              ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
                queryEmptyString: false,
              }),
              ...termQuery(TRANSACTION_TYPE, ruleParams.transactionType, {
                queryEmptyString: false,
              }),
              ...termQuery(TRANSACTION_NAME, ruleParams.transactionName, {
                queryEmptyString: false,
              }),
              ...environmentQuery(ruleParams.environment),
            ]
          : [];

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
                  ...termFilterQuery,
                  ...getParsedFilterQuery(ruleParams.kqlFilter),
                ],
              },
            },
            aggs: {
              series: {
                multi_terms: {
                  terms: [...getGroupByTerms(allGroupByFields)],
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
          const groupByFields = bucket.key.reduce(
            (obj, bucketKey, bucketIndex) => {
              obj[allGroupByFields[bucketIndex]] = bucketKey;
              return obj;
            },
            {} as Record<string, string>
          );

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
              errorRate,
              sourceFields: getServiceGroupFields(failedOutcomeBucket),
              groupByFields,
              bucketKey,
            });
          }
        }

        await asyncForEach(results, async (result) => {
          const { errorRate, sourceFields, groupByFields, bucketKey } = result;
          const alertId = bucketKey.join('_');
          const reasonMessage = formatTransactionErrorRateReason({
            threshold: ruleParams.threshold,
            measured: errorRate,
            asPercent,
            windowSize: ruleParams.windowSize,
            windowUnit: ruleParams.windowUnit,
            groupByFields,
          });

          const alert = services.alertWithLifecycle({
            id: alertId,
            fields: {
              [TRANSACTION_NAME]: ruleParams.transactionName,
              [PROCESSOR_EVENT]: ProcessorEvent.transaction,
              [ALERT_EVALUATION_VALUE]: errorRate,
              [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
              [ALERT_REASON]: reasonMessage,
              ...sourceFields,
              ...groupByFields,
            },
          });

          const relativeViewInAppUrl = getAlertUrlTransaction(
            groupByFields[SERVICE_NAME],
            getEnvironmentEsField(groupByFields[SERVICE_ENVIRONMENT])?.[
              SERVICE_ENVIRONMENT
            ],
            groupByFields[TRANSACTION_TYPE]
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
            reason: reasonMessage,
            threshold: ruleParams.threshold,
            transactionName: ruleParams.transactionName,
            triggerValue: asDecimalOrInteger(errorRate),
            viewInAppUrl,
            ...groupByActionVariables,
          });
        });

        return { state: {} };
      },
      alerts: ApmRuleTypeAlertDefinition,
      getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
        observabilityPaths.ruleDetails(rule.id),
    })
  );
}
