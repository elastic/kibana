/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { take } from 'rxjs/operators';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { getAlertUrlTransaction } from '../../../common/utils/formatters';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  APM_SERVER_FEATURE_ID,
  formatTransactionErrorRateReason,
} from '../../../common/alert_types';
import {
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { asDecimalOrInteger } from '../../../common/utils/formatters';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { SearchAggregatedTransactionSetting } from '../../../common/aggregated_transactions';
import { getDocumentTypeFilterForTransactions } from '../../lib/helpers/transactions';
import { asPercent } from '../../../../observability/common/utils/formatters';
import { termQuery } from '../../../../observability/server';

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  transactionType: schema.maybe(schema.string()),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.TransactionErrorRate];

export function registerTransactionErrorRateAlertType({
  alerting,
  ruleDataClient,
  logger,
  config$,
  basePath,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: AlertType.TransactionErrorRate,
      name: alertTypeConfig.name,
      actionGroups: alertTypeConfig.actionGroups,
      defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
      validate: {
        params: paramsSchema,
      },
      actionVariables: {
        context: [
          apmActionVariables.transactionType,
          apmActionVariables.serviceName,
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
      executor: async ({ services, params: ruleParams }) => {
        const config = await config$.pipe(take(1)).toPromise();
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

        const searchParams = {
          index,
          size: 0,
          body: {
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
                  terms: [
                    { field: SERVICE_NAME },
                    {
                      field: SERVICE_ENVIRONMENT,
                      missing: ENVIRONMENT_NOT_DEFINED.value,
                    },
                    { field: TRANSACTION_TYPE },
                  ],
                  size: 10000,
                },
                aggs: {
                  outcomes: {
                    terms: {
                      field: EVENT_OUTCOME,
                    },
                  },
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

        const results = [];
        for (const bucket of response.aggregations.series.buckets) {
          const [serviceName, environment, transactionType] = bucket.key;

          const failed =
            bucket.outcomes.buckets.find(
              (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
            )?.doc_count ?? 0;
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
            });
          }
        }

        results.forEach((result) => {
          const { serviceName, environment, transactionType, errorRate } =
            result;
          const reasonMessage = formatTransactionErrorRateReason({
            threshold: ruleParams.threshold,
            measured: errorRate,
            asPercent,
            serviceName,
            windowSize: ruleParams.windowSize,
            windowUnit: ruleParams.windowUnit,
          });

          const relativeViewInAppUrl = getAlertUrlTransaction(
            serviceName,
            getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT],
            transactionType
          );
          const viewInAppUrl = basePath.publicBaseUrl
            ? new URL(
                basePath.prepend(relativeViewInAppUrl),
                basePath.publicBaseUrl
              ).toString()
            : relativeViewInAppUrl;
          services
            .alertWithLifecycle({
              id: [
                AlertType.TransactionErrorRate,
                serviceName,
                transactionType,
                environment,
              ]
                .filter((name) => name)
                .join('_'),
              fields: {
                [SERVICE_NAME]: serviceName,
                ...getEnvironmentEsField(environment),
                [TRANSACTION_TYPE]: transactionType,
                [PROCESSOR_EVENT]: ProcessorEvent.transaction,
                [ALERT_EVALUATION_VALUE]: errorRate,
                [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                [ALERT_REASON]: reasonMessage,
              },
            })
            .scheduleActions(alertTypeConfig.defaultActionGroupId, {
              serviceName,
              transactionType,
              environment: getEnvironmentLabel(environment),
              threshold: ruleParams.threshold,
              triggerValue: asDecimalOrInteger(errorRate),
              interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
              reason: reasonMessage,
              viewInAppUrl,
            });
        });

        return {};
      },
    })
  );
}
