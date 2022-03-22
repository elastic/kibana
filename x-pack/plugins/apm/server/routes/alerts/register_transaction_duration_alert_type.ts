/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { take } from 'rxjs/operators';
import { join } from 'path';
import { getAlertUrlTransactionDuration } from '../../../common/utils/formatters';
import { asDuration } from '../../../../observability/common/utils/formatters';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import { SearchAggregatedTransactionSetting } from '../../../common/aggregated_transactions';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  APM_SERVER_FEATURE_ID,
  formatTransactionDurationReason,
} from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
} from '../../../common/elasticsearch_fieldnames';
import {
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getDurationFormatter } from '../../../common/utils/formatters';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
} from '../../lib/helpers/transactions';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal('avg'),
    schema.literal('95th'),
    schema.literal('99th'),
  ]),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.TransactionDuration];

export function registerTransactionDurationAlertType({
  alerting,
  ruleDataClient,
  config$,
  logger,
  basePath,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  const type = createLifecycleRuleType({
    id: AlertType.TransactionDuration,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        apmActionVariables.serviceName,
        apmActionVariables.transactionType,
        apmActionVariables.environment,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
        apmActionVariables.interval,
        apmActionVariables.reason,
        apmActionVariables.viewInAppUrl,
      ],
    },
    producer: APM_SERVER_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();
      const ruleParams = params;
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
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

      const field = getDurationFieldForTransactions(
        searchAggregatedTransactions
      );

      const searchParams = {
        index,
        body: {
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
                { term: { [SERVICE_NAME]: ruleParams.serviceName } },
                {
                  term: {
                    [TRANSACTION_TYPE]: ruleParams.transactionType,
                  },
                },
                ...environmentQuery(ruleParams.environment),
              ] as QueryDslQueryContainer[],
            },
          },
          aggs: {
            latency:
              ruleParams.aggregationType === 'avg'
                ? { avg: { field } }
                : {
                    percentiles: {
                      field,
                      percents: [
                        ruleParams.aggregationType === '95th' ? 95 : 99,
                      ],
                    },
                  },
          },
        },
      };

      const response = await alertingEsClient({
        scopedClusterClient: services.scopedClusterClient,
        params: searchParams,
      });

      if (!response.aggregations) {
        return {};
      }

      const { latency } = response.aggregations;

      const transactionDuration =
        'values' in latency ? Object.values(latency.values)[0] : latency?.value;

      // Converts threshold to microseconds because this is the unit used on transactionDuration
      const thresholdMicroseconds = ruleParams.threshold * 1000;

      if (transactionDuration && transactionDuration > thresholdMicroseconds) {
        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted =
          durationFormatter(transactionDuration).formatted;
        const reasonMessage = formatTransactionDurationReason({
          measured: transactionDuration,
          serviceName: ruleParams.serviceName,
          threshold: thresholdMicroseconds,
          asDuration,
          aggregationType: String(ruleParams.aggregationType),
          windowSize: ruleParams.windowSize,
          windowUnit: ruleParams.windowUnit,
        });

        // The function args wrapped with arrays because this function is shared with the frontend and the vars there are parsed by parseTechnicalFields()
        const relativeViewInAppUrl = getAlertUrlTransactionDuration(
          [ruleParams.serviceName],
          [
            getEnvironmentEsField(ruleParams.environment)?.[
              SERVICE_ENVIRONMENT
            ],
          ],
          [ruleParams.transactionType]
        );

        const viewInAppUrl = basePath.publicBaseUrl
          ? new URL(
              join(basePath.serverBasePath, relativeViewInAppUrl),
              basePath.publicBaseUrl
            ).toString()
          : relativeViewInAppUrl;
        services
          .alertWithLifecycle({
            id: `${AlertType.TransactionDuration}_${getEnvironmentLabel(
              ruleParams.environment
            )}`,
            fields: {
              [SERVICE_NAME]: ruleParams.serviceName,
              ...getEnvironmentEsField(ruleParams.environment),
              [TRANSACTION_TYPE]: ruleParams.transactionType,
              [PROCESSOR_EVENT]: ProcessorEvent.transaction,
              [ALERT_EVALUATION_VALUE]: transactionDuration,
              [ALERT_EVALUATION_THRESHOLD]: thresholdMicroseconds,
              [ALERT_REASON]: reasonMessage,
            },
          })
          .scheduleActions(alertTypeConfig.defaultActionGroupId, {
            transactionType: ruleParams.transactionType,
            serviceName: ruleParams.serviceName,
            environment: getEnvironmentLabel(ruleParams.environment),
            threshold: thresholdMicroseconds,
            triggerValue: transactionDurationFormatted,
            interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
            reason: reasonMessage,
            viewInAppUrl,
          });
      }

      return {};
    },
  });

  alerting.registerType(type);
}
