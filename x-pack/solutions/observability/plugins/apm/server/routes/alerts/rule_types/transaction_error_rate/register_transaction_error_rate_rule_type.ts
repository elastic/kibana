/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  GetViewInAppRelativeUrlFnOpts,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  RuleTypeState,
  RuleExecutorOptions,
} from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { TimeUnitChar } from '@kbn/observability-plugin/common';
import { observabilityFeatureId } from '@kbn/observability-plugin/common';
import {
  formatDurationFromTimeUnitChar,
  getAlertDetailsUrl,
  observabilityPaths,
  ProcessorEvent,
} from '@kbn/observability-plugin/common';
import { asPercent } from '@kbn/observability-plugin/common/utils/formatters';
import { getParsedFilterQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INDEX_PATTERN,
  ALERT_REASON,
  ALERT_RULE_PARAMETERS,
  ApmRuleType,
} from '@kbn/rule-data-utils';
import type { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { asyncForEach } from '@kbn/std';
import { transactionErrorRateParamsSchema } from '@kbn/response-ops-rule-params/transaction_error_rate';
import { unflattenObject } from '@kbn/object-utils';
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
import type {
  THRESHOLD_MET_GROUP,
  ApmRuleParamsType,
  AdditionalContext,
} from '../../../../../common/rules/apm_rule_types';
import {
  APM_SERVER_FEATURE_ID,
  formatTransactionErrorRateReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { asDecimalOrInteger, getAlertUrlTransaction } from '../../../../../common/utils/formatters';
import { getBackwardCompatibleDocumentTypeFilter } from '../../../../lib/helpers/transactions';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import type { RegisterRuleDependencies } from '../../register_apm_rule_types';
import { ApmRuleTypeAlertDefinition } from '../../register_apm_rule_types';
import {
  getApmAlertSourceFields,
  getApmAlertSourceFieldsAgg,
} from '../get_apm_alert_source_fields';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getGroupByActionVariables } from '../utils/get_groupby_action_variables';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionErrorRate];

export const transactionErrorRateActionVariables = [
  apmActionVariables.alertDetailsUrl,
  apmActionVariables.environment,
  apmActionVariables.interval,
  apmActionVariables.reason,
  apmActionVariables.serviceName,
  apmActionVariables.threshold,
  apmActionVariables.transactionName,
  apmActionVariables.transactionType,
  apmActionVariables.triggerValue,
  apmActionVariables.viewInAppUrl,
  apmActionVariables.grouping,
];

type TransactionErrorRateRuleTypeParams = ApmRuleParamsType[ApmRuleType.TransactionErrorRate];
type TransactionErrorRateActionGroups = ActionGroupIdsOf<typeof THRESHOLD_MET_GROUP>;
type TransactionErrorRateRuleTypeState = RuleTypeState;
type TransactionErrorRateAlertState = AlertState;
type TransactionErrorRateAlertContext = AlertContext;
type TransactionErrorRateAlert = ObservabilityApmAlert;

export function registerTransactionErrorRateRuleType({
  alerting,
  alertsLocator,
  apmConfig,
  basePath,
  getApmIndices,
  logger,
  ruleDataClient,
}: RegisterRuleDependencies) {
  if (!alerting) {
    throw new Error(
      'Cannot register the transaction error rate rule type. The alerting plugin need to be enabled.'
    );
  }

  alerting.registerType({
    id: ApmRuleType.TransactionErrorRate,
    name: ruleTypeConfig.name,
    actionGroups: ruleTypeConfig.actionGroups,
    defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
    validate: { params: transactionErrorRateParamsSchema },
    doesSetRecoveryContext: true,
    schemas: {
      params: {
        type: 'config-schema',
        schema: transactionErrorRateParamsSchema,
      },
    },
    actionVariables: {
      context: transactionErrorRateActionVariables,
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: APM_SERVER_FEATURE_ID,
    solution: observabilityFeatureId,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (
      options: RuleExecutorOptions<
        TransactionErrorRateRuleTypeParams,
        TransactionErrorRateRuleTypeState,
        TransactionErrorRateAlertState,
        TransactionErrorRateAlertContext,
        TransactionErrorRateActionGroups,
        TransactionErrorRateAlert
      >
    ) => {
      const { services, spaceId, params: ruleParams, getTimeRange } = options;
      const { alertsClient, savedObjectsClient, scopedClusterClient, uiSettingsClient } = services;
      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const allGroupByFields = getAllGroupByFields(
        ApmRuleType.TransactionErrorRate,
        ruleParams.groupBy
      );

      const indices = await getApmIndices(savedObjectsClient);

      // only query transaction events when set to 'never',
      // to prevent (likely) unnecessary blocking request
      // in rule execution
      const searchAggregatedTransactions =
        apmConfig.searchAggregatedTransactions !== SearchAggregatedTransactionSetting.never;

      const index = searchAggregatedTransactions ? indices.metric : indices.transaction;

      const termFilterQuery = !ruleParams.searchConfiguration?.query?.query
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

      const { dateStart } = getTimeRange(`${ruleParams.windowSize}${ruleParams.windowUnit}`);

      const searchParams = {
        index,
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
              ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
              {
                terms: {
                  [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
                },
              },
              ...termFilterQuery,
              ...getParsedFilterQuery(ruleParams.searchConfiguration?.query?.query as string),
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
                aggs: getApmAlertSourceFieldsAgg(),
              },
            },
          },
        },
      };

      const response = await alertingEsClient({
        scopedClusterClient,
        uiSettingsClient,
        params: searchParams,
      });

      if (!response.aggregations) {
        return { state: {} };
      }

      const results = [];

      for (const bucket of response.aggregations.series.buckets) {
        const groupByFields = bucket.key.reduce((obj, bucketKey, bucketIndex) => {
          obj[allGroupByFields[bucketIndex]] = bucketKey;
          return obj;
        }, {} as Record<string, string>);

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
            sourceFields: getApmAlertSourceFields(failedOutcomeBucket),
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

        const { uuid } = alertsClient.report({
          id: alertId,
          actionGroup: ruleTypeConfig.defaultActionGroupId,
        });

        const relativeViewInAppUrl = getAlertUrlTransaction(
          groupByFields[SERVICE_NAME],
          getEnvironmentEsField(groupByFields[SERVICE_ENVIRONMENT])?.[SERVICE_ENVIRONMENT],
          groupByFields[TRANSACTION_TYPE]
        );
        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          relativeViewInAppUrl
        );
        const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, uuid);
        const groupByActionVariables = getGroupByActionVariables(groupByFields);
        const groupingObject = unflattenObject(groupByFields);

        const payload = {
          [TRANSACTION_NAME]: ruleParams.transactionName,
          [PROCESSOR_EVENT]: ProcessorEvent.transaction,
          [ALERT_EVALUATION_VALUE]: errorRate,
          [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
          [ALERT_REASON]: reasonMessage,
          [ALERT_INDEX_PATTERN]: index,
          ...sourceFields,
          ...groupByFields,
        };

        const context = {
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
          grouping: groupingObject,
          ...groupByActionVariables,
        };

        alertsClient.setAlertData({
          id: alertId,
          payload,
          context,
        });
      });

      // Handle recovered alerts context
      const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];
      for (const recoveredAlert of recoveredAlerts) {
        const alertHits = recoveredAlert.hit as AdditionalContext;
        const recoveredAlertId = recoveredAlert.alert.getId();
        const alertUuid = recoveredAlert.alert.getUuid();
        const alertDetailsUrl = getAlertDetailsUrl(basePath, spaceId, alertUuid);

        const ruleParamsOfRecoveredAlert = alertHits?.[ALERT_RULE_PARAMETERS];
        const groupByFieldsOfRecoveredAlert = ruleParamsOfRecoveredAlert?.groupBy ?? [];
        const allGroupByFieldsOfRecoveredAlert = getAllGroupByFields(
          ApmRuleType.TransactionErrorRate,
          groupByFieldsOfRecoveredAlert
        );
        const groupByFields: Record<string, string> = allGroupByFieldsOfRecoveredAlert.reduce(
          (acc, sourceField: string) => {
            if (alertHits?.[sourceField] !== undefined) {
              acc[sourceField] = alertHits[sourceField];
            }
            return acc;
          },
          {} as Record<string, string>
        );
        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          getAlertUrlTransaction(
            groupByFields[SERVICE_NAME],
            getEnvironmentEsField(groupByFields[SERVICE_ENVIRONMENT])?.[SERVICE_ENVIRONMENT],
            groupByFields[TRANSACTION_TYPE]
          )
        );

        const groupByActionVariables = getGroupByActionVariables(groupByFields);
        const groupingObject = unflattenObject(groupByFields);

        const recoveredContext = {
          alertDetailsUrl,
          interval: formatDurationFromTimeUnitChar(
            ruleParams.windowSize,
            ruleParams.windowUnit as TimeUnitChar
          ),
          reason: alertHits?.[ALERT_REASON],
          // When group by doesn't include transaction.name, the context.transaction.name action variable will contain value of the Transaction Name filter
          transactionName: ruleParams.transactionName,
          threshold: ruleParams.threshold,
          triggerValue: asDecimalOrInteger(alertHits?.[ALERT_EVALUATION_VALUE]),
          viewInAppUrl,
          grouping: groupingObject,
          ...groupByActionVariables,
        };

        alertsClient.setAlertData({
          id: recoveredAlertId,
          context: recoveredContext,
        });
      }

      return { state: {} };
    },
    alerts: ApmRuleTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
