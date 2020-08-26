/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { KibanaRequest } from '../../../../../../src/core/server';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import { AlertingPlugin } from '../../../../alerts/server';
import { APMConfig } from '../..';
import { MlPluginSetup } from '../../../../ml/server';
import { getMLJobIds } from '../service_map/get_service_anomalies';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  ml?: MlPluginSetup;
  config$: Observable<APMConfig>;
}

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  environment: schema.string(),
  anomalyScore: schema.number(),
});

const alertTypeConfig =
  ALERT_TYPES_CONFIG[AlertType.TransactionDurationAnomaly];

export function registerTransactionDurationAnomalyAlertType({
  alerts,
  ml,
  config$,
}: RegisterAlertParams) {
  alerts.registerType({
    id: AlertType.TransactionDurationAnomaly,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        {
          description: i18n.translate(
            'xpack.apm.registerTransactionDurationAnomalyAlertType.variables.serviceName',
            {
              defaultMessage: 'Service name',
            }
          ),
          name: 'serviceName',
        },
        {
          description: i18n.translate(
            'xpack.apm.registerTransactionDurationAnomalyAlertType.variables.transactionType',
            {
              defaultMessage: 'Transaction type',
            }
          ),
          name: 'transactionType',
        },
      ],
    },
    producer: 'apm',
    executor: async ({ services, params, state }) => {
      if (!ml) {
        return;
      }
      const alertParams = params as TypeOf<typeof paramsSchema>;
      const mlClient = services.getLegacyScopedClusterClient(ml.mlClient);
      const request = { params: 'DummyKibanaRequest' } as KibanaRequest;
      const { mlAnomalySearch } = ml.mlSystemProvider(mlClient, request);
      const anomalyDetectors = ml.anomalyDetectorsProvider(mlClient, request);

      const mlJobIds = await getMLJobIds(
        anomalyDetectors,
        alertParams.environment
      );
      const anomalySearchParams = {
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { result_type: 'record' } },
                { terms: { job_id: mlJobIds } },
                {
                  range: {
                    timestamp: {
                      gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`,
                      format: 'epoch_millis',
                    },
                  },
                },
                {
                  term: {
                    partition_field_value: alertParams.serviceName,
                  },
                },
                {
                  range: {
                    record_score: {
                      gte: alertParams.anomalyScore,
                    },
                  },
                },
              ],
            },
          },
        },
      };

      const response = ((await mlAnomalySearch(
        anomalySearchParams
      )) as unknown) as { hits: { total: { value: number } } };
      const hitCount = response.hits.total.value;

      if (hitCount > 0) {
        const alertInstance = services.alertInstanceFactory(
          AlertType.TransactionDurationAnomaly
        );
        alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
          serviceName: alertParams.serviceName,
        });
      }

      return {};
    },
  });
}
