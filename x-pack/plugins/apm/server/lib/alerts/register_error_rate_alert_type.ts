/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../common/elasticsearch_fieldnames';
import { AlertingPlugin } from '../../../../alerts/server';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { APMConfig } from '../..';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  config$: Observable<APMConfig>;
}

const paramsSchema = schema.object({
  serviceName: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.ErrorRate];

export function registerErrorRateAlertType({
  alerts,
  config$,
}: RegisterAlertParams) {
  alerts.registerType({
    id: AlertType.ErrorRate,
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
            'xpack.apm.registerErrorRateAlertType.variables.serviceName',
            {
              defaultMessage: 'Service name',
            }
          ),
          name: 'serviceName',
        },
      ],
    },
    producer: 'apm',
    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();

      const alertParams = params as TypeOf<typeof paramsSchema>;

      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });

      const environmentTerm =
        alertParams.environment === ENVIRONMENT_ALL
          ? []
          : [{ term: { [SERVICE_ENVIRONMENT]: alertParams.environment } }];

      const searchParams = {
        index: indices['apm_oss.errorIndices'],
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
                {
                  term: {
                    [PROCESSOR_EVENT]: 'error',
                  },
                },
                {
                  term: {
                    [SERVICE_NAME]: alertParams.serviceName,
                  },
                },
                ...environmentTerm,
              ],
            },
          },
          track_total_hits: true,
        },
      };

      const response: ESSearchResponse<
        unknown,
        ESSearchRequest
      > = await services.callCluster('search', searchParams);

      const value = response.hits.total.value;

      if (value && value > alertParams.threshold) {
        const alertInstance = services.alertInstanceFactory(
          AlertType.ErrorRate
        );
        alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
          serviceName: alertParams.serviceName,
        });
      }

      return {};
    },
  });
}
