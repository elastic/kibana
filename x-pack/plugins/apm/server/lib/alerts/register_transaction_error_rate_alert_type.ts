/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { isEmpty } from 'lodash';
import { asDecimalOrInteger } from '../../../common/utils/formatters';
import { ProcessorEvent } from '../../../common/processor_event';
import { EventOutcome } from '../../../common/event_outcome';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import { ESSearchResponse } from '../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  EVENT_OUTCOME,
  SERVICE_ENVIRONMENT,
} from '../../../common/elasticsearch_fieldnames';
import { AlertingPlugin } from '../../../../alerts/server';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { APMConfig } from '../..';
import { getEnvironmentUiFilterES } from '../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { apmActionVariables } from './action_variables';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  config$: Observable<APMConfig>;
}

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
  alerts,
  config$,
}: RegisterAlertParams) {
  alerts.registerType({
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
    producer: 'apm',
    executor: async ({ services, params: alertParams }) => {
      const config = await config$.pipe(take(1)).toPromise();
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });

      const searchParams = {
        index: indices['apm_oss.transactionIndices'],
        size: 0,
        body: {
          track_total_hits: true,
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
                { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
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
                ...getEnvironmentUiFilterES(alertParams.environment),
              ],
            },
          },
          aggs: {
            erroneous_transactions: {
              filter: { term: { [EVENT_OUTCOME]: EventOutcome.failure } },
            },
            services: {
              terms: {
                field: SERVICE_NAME,
                size: 50,
              },
              aggs: {
                transaction_types: {
                  terms: { field: TRANSACTION_TYPE },
                  aggs: {
                    environments: {
                      terms: {
                        field: SERVICE_ENVIRONMENT,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const response: ESSearchResponse<
        unknown,
        typeof searchParams
      > = await services.callCluster('search', searchParams);

      if (!response.aggregations) {
        return;
      }

      const errornousTransactionsCount =
        response.aggregations.erroneous_transactions.doc_count;
      const totalTransactionCount = response.hits.total.value;
      const transactionErrorRate =
        (errornousTransactionsCount / totalTransactionCount) * 100;

      if (transactionErrorRate > alertParams.threshold) {
        function scheduleAction({
          serviceName,
          environment,
          transactionType,
        }: {
          serviceName: string;
          environment?: string;
          transactionType?: string;
        }) {
          const alertInstanceName = [
            AlertType.TransactionErrorRate,
            serviceName,
            transactionType,
            environment,
          ]
            .filter((name) => name)
            .join('_');

          const alertInstance = services.alertInstanceFactory(
            alertInstanceName
          );
          alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
            serviceName,
            transactionType,
            environment,
            threshold: alertParams.threshold,
            triggerValue: asDecimalOrInteger(transactionErrorRate),
            interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
          });
        }

        response.aggregations?.services.buckets.forEach((serviceBucket) => {
          const serviceName = serviceBucket.key as string;
          if (isEmpty(serviceBucket.transaction_types?.buckets)) {
            scheduleAction({ serviceName });
          } else {
            serviceBucket.transaction_types.buckets.forEach((typeBucket) => {
              const transactionType = typeBucket.key as string;
              if (isEmpty(typeBucket.environments?.buckets)) {
                scheduleAction({ serviceName, transactionType });
              } else {
                typeBucket.environments.buckets.forEach((envBucket) => {
                  const environment = envBucket.key as string;
                  scheduleAction({ serviceName, transactionType, environment });
                });
              }
            });
          }
        });
      }
    },
  });
}
