/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { take } from 'rxjs/operators';
import type {
  ALERT_EVALUATION_THRESHOLD as ALERT_EVALUATION_THRESHOLD_TYPED,
  ALERT_EVALUATION_VALUE as ALERT_EVALUATION_VALUE_TYPED,
  ALERT_REASON as ALERT_REASON_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_EVALUATION_THRESHOLD as ALERT_EVALUATION_THRESHOLD_NON_TYPED,
  ALERT_EVALUATION_VALUE as ALERT_EVALUATION_VALUE_NON_TYPED,
  ALERT_REASON as ALERT_REASON_NON_TYPED,
  // @ts-expect-error
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
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
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { SearchAggregatedTransactionSetting } from '../../../common/aggregated_transactions';
import { getDocumentTypeFilterForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { asPercent } from '../../../../observability/common/utils/formatters';

const ALERT_EVALUATION_THRESHOLD: typeof ALERT_EVALUATION_THRESHOLD_TYPED =
  ALERT_EVALUATION_THRESHOLD_NON_TYPED;
const ALERT_EVALUATION_VALUE: typeof ALERT_EVALUATION_VALUE_TYPED =
  ALERT_EVALUATION_VALUE_NON_TYPED;
const ALERT_REASON: typeof ALERT_REASON_TYPED = ALERT_REASON_NON_TYPED;

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
        ],
      },
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ services, params: alertParams }) => {
        const config = await config$.pipe(take(1)).toPromise();
        const indices = await getApmIndices({
          config,
          savedObjectsClient: services.savedObjectsClient,
        });

        // only query transaction events when set to 'never',
        // to prevent (likely) unnecessary blocking request
        // in rule execution
        const searchAggregatedTransactions =
          config['xpack.apm.searchAggregatedTransactions'] !==
          SearchAggregatedTransactionSetting.never;

        const index = searchAggregatedTransactions
          ? indices['apm_oss.metricsIndices']
          : indices['apm_oss.transactionIndices'];

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
                        gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`,
                      },
                    },
                  },
                  ...getDocumentTypeFilterForAggregatedTransactions(
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
                  ...(alertParams.serviceName
                    ? [{ term: { [SERVICE_NAME]: alertParams.serviceName } }]
                    : []),
                  ...(alertParams.transactionType
                    ? [
                        {
                          term: {
                            [TRANSACTION_TYPE]: alertParams.transactionType,
                          },
                        },
                      ]
                    : []),
                  ...environmentQuery(alertParams.environment),
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

        const results = response.aggregations.series.buckets
          .map((bucket) => {
            const [serviceName, environment, transactionType] = bucket.key;

            const failed =
              bucket.outcomes.buckets.find(
                (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
              )?.doc_count ?? 0;
            const succesful =
              bucket.outcomes.buckets.find(
                (outcomeBucket) => outcomeBucket.key === EventOutcome.success
              )?.doc_count ?? 0;

            return {
              serviceName,
              environment,
              transactionType,
              errorRate: (failed / (failed + succesful)) * 100,
            };
          })
          .filter((result) => result.errorRate >= alertParams.threshold);

        results.forEach((result) => {
          const { serviceName, environment, transactionType, errorRate } =
            result;

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
                [ALERT_EVALUATION_THRESHOLD]: alertParams.threshold,
                [ALERT_REASON]: formatTransactionErrorRateReason({
                  threshold: alertParams.threshold,
                  measured: errorRate,
                  asPercent,
                  serviceName,
                }),
              },
            })
            .scheduleActions(alertTypeConfig.defaultActionGroupId, {
              serviceName,
              transactionType,
              environment: getEnvironmentLabel(environment),
              threshold: alertParams.threshold,
              triggerValue: asDecimalOrInteger(errorRate),
              interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
            });
        });

        return {};
      },
    })
  );
}
