/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
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
  asDuration,
  formatDurationFromTimeUnitChar,
  getAlertDetailsUrl,
  observabilityPaths,
  ProcessorEvent,
} from '@kbn/observability-plugin/common';
import { getParsedFilterQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ALERT_RULE_PARAMETERS,
  ApmRuleType,
} from '@kbn/rule-data-utils';
import type { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { transactionDurationParamsSchema } from '@kbn/response-ops-rule-params/transaction_duration';
import { unflattenObject } from '@kbn/object-utils';
import { getDurationFieldForTransactions } from '@kbn/apm-data-access-plugin/server/utils';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { SearchAggregatedTransactionSetting } from '../../../../../common/aggregated_transactions';
import { getEnvironmentEsField } from '../../../../../common/environment_filter_values';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import type {
  THRESHOLD_MET_GROUP,
  ApmRuleParamsType,
  AdditionalContext,
} from '../../../../../common/rules/apm_rule_types';
import {
  APM_SERVER_FEATURE_ID,
  formatTransactionDurationReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import {
  getAlertUrlTransaction,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { getBackwardCompatibleDocumentTypeFilter } from '../../../../lib/helpers/transactions';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import type { RegisterRuleDependencies } from '../../register_apm_rule_types';
import { ApmRuleTypeAlertDefinition } from '../../register_apm_rule_types';
import {
  getApmAlertSourceFields,
  getApmAlertSourceFieldsAgg,
} from '../get_apm_alert_source_fields';
import { averageOrPercentileAgg, getMultiTermsSortOrder } from './average_or_percentile_agg';
import { getGroupByActionVariables } from '../utils/get_groupby_action_variables';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionDuration];

export const transactionDurationActionVariables = [
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

type TransactionDurationRuleTypeParams = ApmRuleParamsType[ApmRuleType.TransactionDuration];
type TransactionDurationActionGroups = ActionGroupIdsOf<typeof THRESHOLD_MET_GROUP>;
type TransactionDurationRuleTypeState = RuleTypeState;
type TransactionDurationAlertState = AlertState;
type TransactionDurationAlertContext = AlertContext;
type TransactionDurationAlert = ObservabilityApmAlert;

export function registerTransactionDurationRuleType({
  alerting,
  apmConfig,
  getApmIndices,
  basePath,
}: RegisterRuleDependencies) {
  if (!alerting) {
    throw new Error(
      'Cannot register transaction duration rule type. Both the actions and alerting plugins need to be enabled.'
    );
  }

  alerting.registerType({
    id: ApmRuleType.TransactionDuration,
    name: ruleTypeConfig.name,
    actionGroups: ruleTypeConfig.actionGroups,
    defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
    validate: { params: transactionDurationParamsSchema },
    doesSetRecoveryContext: true,
    schemas: {
      params: {
        type: 'config-schema',
        schema: transactionDurationParamsSchema,
      },
    },
    actionVariables: {
      context: transactionDurationActionVariables,
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: APM_SERVER_FEATURE_ID,
    solution: observabilityFeatureId,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (
      options: RuleExecutorOptions<
        TransactionDurationRuleTypeParams,
        TransactionDurationRuleTypeState,
        TransactionDurationAlertState,
        TransactionDurationAlertContext,
        TransactionDurationActionGroups,
        TransactionDurationAlert
      >
    ) => {
      const { params: ruleParams, services, spaceId, getTimeRange } = options;
      const { alertsClient, savedObjectsClient, scopedClusterClient, uiSettingsClient } = services;
      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const allGroupByFields = getAllGroupByFields(
        ApmRuleType.TransactionDuration,
        ruleParams.groupBy
      );

      const indices = await getApmIndices(savedObjectsClient);

      // only query transaction events when set to 'never',
      // to prevent (likely) unnecessary blocking request
      // in rule execution
      const searchAggregatedTransactions =
        apmConfig.searchAggregatedTransactions !== SearchAggregatedTransactionSetting.never;

      const index = searchAggregatedTransactions ? indices.metric : indices.transaction;

      const field = getDurationFieldForTransactions(searchAggregatedTransactions);

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
        _source: false as const,
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
              ...termFilterQuery,
              ...getParsedFilterQuery(ruleParams.searchConfiguration?.query?.query as string),
            ] as QueryDslQueryContainer[],
          },
        },
        aggs: {
          series: {
            multi_terms: {
              terms: [...getGroupByTerms(allGroupByFields)],
              size: 1000,
              ...getMultiTermsSortOrder(ruleParams.aggregationType),
            },
            aggs: {
              ...averageOrPercentileAgg({
                aggregationType: ruleParams.aggregationType,
                transactionDurationField: field,
              }),
              ...getApmAlertSourceFieldsAgg(),
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

      // Converts threshold to microseconds because this is the unit used on transactionDuration
      const thresholdMicroseconds = ruleParams.threshold * 1000;

      const triggeredBuckets = [];

      for (const bucket of response.aggregations.series.buckets) {
        const groupByFields = bucket.key.reduce((obj, bucketKey, bucketIndex) => {
          obj[allGroupByFields[bucketIndex]] = bucketKey as string;
          return obj;
        }, {} as Record<string, string>);

        const bucketKey = bucket.key;

        const transactionDuration =
          'avgLatency' in bucket // only true if ruleParams.aggregationType === 'avg'
            ? bucket.avgLatency.value
            : bucket.pctLatency.values[0].value;

        if (transactionDuration !== null && transactionDuration > thresholdMicroseconds) {
          triggeredBuckets.push({
            sourceFields: getApmAlertSourceFields(bucket),
            transactionDuration,
            groupByFields,
            bucketKey,
          });
        }
      }

      for (const {
        transactionDuration,
        sourceFields,
        groupByFields,
        bucketKey,
      } of triggeredBuckets) {
        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted = durationFormatter(transactionDuration).formatted;

        const reason = formatTransactionDurationReason({
          aggregationType: String(ruleParams.aggregationType),
          asDuration,
          measured: transactionDuration,
          threshold: thresholdMicroseconds,
          windowSize: ruleParams.windowSize,
          windowUnit: ruleParams.windowUnit,
          groupByFields,
        });

        const alertId = bucketKey.join('_');
        const { uuid } = alertsClient.report({
          id: alertId,
          actionGroup: ruleTypeConfig.defaultActionGroupId,
        });

        const alertDetailsUrl = getAlertDetailsUrl(basePath, spaceId, uuid);
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

        const context = {
          alertDetailsUrl,
          interval: formatDurationFromTimeUnitChar(
            ruleParams.windowSize,
            ruleParams.windowUnit as TimeUnitChar
          ),
          reason,
          // When group by doesn't include transaction.name, the context.transaction.name action variable will contain value of the Transaction Name filter
          transactionName: ruleParams.transactionName,
          threshold: ruleParams.threshold,
          triggerValue: transactionDurationFormatted,
          viewInAppUrl,
          grouping: groupingObject,
          ...groupByActionVariables,
        };

        const payload = {
          [TRANSACTION_NAME]: ruleParams.transactionName,
          [PROCESSOR_EVENT]: ProcessorEvent.transaction,
          [ALERT_EVALUATION_VALUE]: transactionDuration,
          [ALERT_EVALUATION_THRESHOLD]: thresholdMicroseconds,
          [ALERT_REASON]: reason,
          ...sourceFields,
          ...groupByFields,
        };

        alertsClient.setAlertData({
          id: alertId,
          payload,
          context,
        });
      }
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
          ApmRuleType.TransactionDuration,
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

        const durationFormatter = getDurationFormatter(alertHits?.[ALERT_EVALUATION_VALUE]);
        const transactionDurationFormatted = durationFormatter(
          alertHits?.[ALERT_EVALUATION_VALUE]
        ).formatted;
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
          triggerValue: transactionDurationFormatted,
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
