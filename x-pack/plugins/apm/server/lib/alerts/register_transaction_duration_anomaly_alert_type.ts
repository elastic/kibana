/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { KibanaRequest } from '../../../../../../src/core/server';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import { AlertingPlugin } from '../../../../alerts/server';
import { APMConfig } from '../..';
import { MlPluginSetup } from '../../../../ml/server';
import { getMLJobIds } from '../service_map/get_service_anomalies';
import { apmActionVariables } from './action_variables';

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
        apmActionVariables.serviceName,
        apmActionVariables.transactionType,
        apmActionVariables.environment,
      ],
    },
    producer: 'apm',
    executor: async ({ services, params, state }) => {
      if (!ml) {
        return;
      }
      const alertParams = params;
      const request = {} as KibanaRequest;
      const { mlAnomalySearch } = ml.mlSystemProvider(request);
      const anomalyDetectors = ml.anomalyDetectorsProvider(request);

      const mlJobIds = await getMLJobIds(
        anomalyDetectors,
        alertParams.environment
      );

      if (mlJobIds.length === 0) {
        return {};
      }

      const anomalySearchParams = {
        body: {
          terminateAfter: 1,
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
          transactionType: alertParams.transactionType,
          environment: alertParams.environment,
        });
      }
    },
  });
}
