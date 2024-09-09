/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  GetViewInAppRelativeUrlFnOpts,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  RuleTypeState,
  RuleExecutorOptions,
  AlertsClientError,
} from '@kbn/alerting-plugin/server';
import {
  formatDurationFromTimeUnitChar,
  getAlertUrl,
  observabilityPaths,
  ProcessorEvent,
  TimeUnitChar,
} from '@kbn/observability-plugin/common';
import { asPercent } from '@kbn/observability-plugin/common/utils/formatters';
import { getParsedFilterQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ApmRuleType,
} from '@kbn/rule-data-utils';
import { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { asyncForEach } from '@kbn/std';
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
  APM_SERVER_FEATURE_ID,
  formatTransactionErrorRateReason,
  RULE_TYPES_CONFIG,
  THRESHOLD_MET_GROUP,
} from '../../../../../common/rules/apm_rule_types';
import {
  transactionErrorRateParamsSchema,
  ApmRuleParamsType,
} from '../../../../../common/rules/schema';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { asDecimalOrInteger, getAlertUrlTransaction } from '../../../../../common/utils/formatters';
import { getBackwardCompatibleDocumentTypeFilter } from '../../../../lib/helpers/transactions';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import {
  ApmRuleTypeAlertDefinition,
  RegisterRuleDependencies,
} from '../../register_apm_rule_types';
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
      const { services, spaceId, params: ruleParams, startedAt, getTimeRange } = options;
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

        const { uuid, start } = alertsClient.report({
          id: alertId,
          actionGroup: ruleTypeConfig.defaultActionGroupId,
        });
        const indexedStartedAt = start ?? startedAt.toISOString();

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
        const alertDetailsUrl = await getAlertUrl(
          uuid,
          spaceId,
          indexedStartedAt,
          alertsLocator,
          basePath.publicBaseUrl
        );
        const groupByActionVariables = getGroupByActionVariables(groupByFields);

        const payload = {
          [TRANSACTION_NAME]: ruleParams.transactionName,
          [PROCESSOR_EVENT]: ProcessorEvent.transaction,
          [ALERT_EVALUATION_VALUE]: errorRate,
          [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
          [ALERT_REASON]: reasonMessage,
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
          ...groupByActionVariables,
        };

        alertsClient.setAlertData({
          id: alertId,
          payload,
          context,
        });
      });

      return { state: {} };
    },
    alerts: ApmRuleTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
