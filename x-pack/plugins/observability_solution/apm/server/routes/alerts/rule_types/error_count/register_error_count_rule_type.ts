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
  getAlertDetailsUrl,
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
import { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import { getParsedFilterQuery, termQuery } from '@kbn/observability-plugin/server';
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
  THRESHOLD_MET_GROUP,
} from '../../../../../common/rules/apm_rule_types';
import { errorCountParamsSchema, ApmRuleParamsType } from '../../../../../common/rules/schema';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getAlertUrlErrorCount } from '../../../../../common/utils/formatters';
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

type ErrorCountRuleTypeParams = ApmRuleParamsType[ApmRuleType.ErrorCount];
type ErrorCountActionGroups = ActionGroupIdsOf<typeof THRESHOLD_MET_GROUP>;
type ErrorCountRuleTypeState = RuleTypeState;
type ErrorCountAlertState = AlertState;
type ErrorCountAlertContext = AlertContext;
type ErrorCountAlert = ObservabilityApmAlert;

export function registerErrorCountRuleType({
  alerting,
  alertsLocator,
  basePath,
  getApmIndices,
  logger,
  ruleDataClient,
}: RegisterRuleDependencies) {
  if (!alerting) {
    throw new Error(
      'Cannot register error count rule type. The alerting plugin needs to be enabled.'
    );
  }
  alerting.registerType({
    id: ApmRuleType.ErrorCount,
    name: ruleTypeConfig.name,
    actionGroups: ruleTypeConfig.actionGroups,
    defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
    validate: { params: errorCountParamsSchema },
    schemas: {
      params: {
        type: 'config-schema',
        schema: errorCountParamsSchema,
      },
    },
    actionVariables: {
      context: errorCountActionVariables,
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: APM_SERVER_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (
      options: RuleExecutorOptions<
        ErrorCountRuleTypeParams,
        ErrorCountRuleTypeState,
        ErrorCountAlertState,
        ErrorCountAlertContext,
        ErrorCountActionGroups,
        ErrorCountAlert
      >
    ) => {
      const { params: ruleParams, services, spaceId, getTimeRange } = options;
      const { alertsClient, savedObjectsClient, scopedClusterClient, uiSettingsClient } = services;
      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const allGroupByFields = getAllGroupByFields(ApmRuleType.ErrorCount, ruleParams.groupBy);

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

      const { dateStart } = getTimeRange(`${ruleParams.windowSize}${ruleParams.windowUnit}`);

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
                ...getParsedFilterQuery(ruleParams.searchConfiguration?.query?.query as string),
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
              aggs: getApmAlertSourceFieldsAgg(),
            },
          },
        },
      };

      const response = await alertingEsClient({
        scopedClusterClient,
        uiSettingsClient,
        params: searchParams,
      });

      const errorCountResults =
        response.aggregations?.error_counts.buckets.map((bucket) => {
          const groupByFields = bucket.key.reduce((obj, bucketKey, bucketIndex) => {
            obj[allGroupByFields[bucketIndex]] = bucketKey;
            return obj;
          }, {} as Record<string, string>);

          const bucketKey = bucket.key;

          return {
            errorCount: bucket.doc_count,
            sourceFields: getApmAlertSourceFields(bucket),
            groupByFields,
            bucketKey,
          };
        }) ?? [];

      await asyncForEach(
        errorCountResults.filter((result) => result.errorCount >= ruleParams.threshold),
        async (result) => {
          const { errorCount, sourceFields, groupByFields, bucketKey } = result;
          const alertId = bucketKey.join('_');
          const alertReason = formatErrorCountReason({
            threshold: ruleParams.threshold,
            measured: errorCount,
            windowSize: ruleParams.windowSize,
            windowUnit: ruleParams.windowUnit,
            groupByFields,
          });

          const { uuid } = alertsClient.report({
            id: alertId,
            actionGroup: ruleTypeConfig.defaultActionGroupId,
          });

          const relativeViewInAppUrl = getAlertUrlErrorCount(
            groupByFields[SERVICE_NAME],
            getEnvironmentEsField(groupByFields[SERVICE_ENVIRONMENT])?.[SERVICE_ENVIRONMENT]
          );
          const viewInAppUrl = addSpaceIdToPath(
            basePath.publicBaseUrl,
            spaceId,
            relativeViewInAppUrl
          );
          const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, uuid);
          const groupByActionVariables = getGroupByActionVariables(groupByFields);

          const payload = {
            [PROCESSOR_EVENT]: ProcessorEvent.error,
            [ALERT_EVALUATION_VALUE]: errorCount,
            [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
            [ERROR_GROUP_ID]: ruleParams.errorGroupingKey,
            [ALERT_REASON]: alertReason,
            ...sourceFields,
            ...groupByFields,
          };

          const context = {
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
          };

          alertsClient.setAlertData({
            id: alertId,
            payload,
            context,
          });
        }
      );

      return { state: {} };
    },
    alerts: ApmRuleTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
