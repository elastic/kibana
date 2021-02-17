/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { APMConfig } from '../..';
import { AlertingPlugin } from '../../../../alerts/server';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { getDurationFormatter } from '../../../common/utils/formatters';
import { environmentQuery } from '../../../common/utils/queries';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  config$: Observable<APMConfig>;
}

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
  alerts,
  config$,
}: RegisterAlertParams) {
  alerts.registerType({
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
      ],
    },
    producer: 'apm',
    minimumLicenseRequired: 'basic',
    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();
      const alertParams = params;
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });
      const maxServiceEnvironments = config['xpack.apm.maxServiceEnvironments'];

      const searchParams = {
        index: indices['apm_oss.transactionIndices'],
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
                { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
                { term: { [SERVICE_NAME]: alertParams.serviceName } },
                { term: { [TRANSACTION_TYPE]: alertParams.transactionType } },
                ...environmentQuery(alertParams.environment),
              ],
            },
          },
          aggs: {
            agg:
              alertParams.aggregationType === 'avg'
                ? { avg: { field: TRANSACTION_DURATION } }
                : {
                    percentiles: {
                      field: TRANSACTION_DURATION,
                      percents: [
                        alertParams.aggregationType === '95th' ? 95 : 99,
                      ],
                    },
                  },
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
                size: maxServiceEnvironments,
              },
            },
          },
        },
      };

      const response = await alertingEsClient(services, searchParams);

      if (!response.aggregations) {
        return;
      }

      const { agg, environments } = response.aggregations;

      const transactionDuration =
        'values' in agg ? Object.values(agg.values)[0] : agg?.value;

      const threshold = alertParams.threshold * 1000;

      if (transactionDuration && transactionDuration > threshold) {
        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted = durationFormatter(
          transactionDuration
        ).formatted;

        environments.buckets.map((bucket) => {
          const environment = bucket.key;
          const alertInstance = services.alertInstanceFactory(
            `${AlertType.TransactionDuration}_${environment}`
          );

          alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
            transactionType: alertParams.transactionType,
            serviceName: alertParams.serviceName,
            environment,
            threshold,
            triggerValue: transactionDurationFormatted,
            interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
          });
        });
      }
    },
  });
}
