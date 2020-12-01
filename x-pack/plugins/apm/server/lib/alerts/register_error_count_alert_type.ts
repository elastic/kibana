/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isEmpty } from 'lodash';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { APMConfig } from '../..';
import { ESSearchResponse } from '../../../../../typings/elasticsearch';
import { AlertingPlugin } from '../../../../alerts/server';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { getEnvironmentUiFilterES } from '../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  config$: Observable<APMConfig>;
}

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.ErrorCount];

export function registerErrorCountAlertType({
  alerts,
  config$,
}: RegisterAlertParams) {
  alerts.registerType({
    id: AlertType.ErrorCount,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        apmActionVariables.serviceName,
        apmActionVariables.environment,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
        apmActionVariables.interval,
      ],
    },
    producer: 'apm',
    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();
      const alertParams = params;
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });
      const maxServiceEnvironments = config['xpack.apm.maxServiceEnvironments'];

      const searchParams = {
        index: indices['apm_oss.errorIndices'],
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
                { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                ...(alertParams.serviceName
                  ? [{ term: { [SERVICE_NAME]: alertParams.serviceName } }]
                  : []),
                ...getEnvironmentUiFilterES(alertParams.environment),
              ],
            },
          },
          aggs: {
            services: {
              terms: {
                field: SERVICE_NAME,
                size: 50,
              },
              aggs: {
                environments: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                    size: maxServiceEnvironments,
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

      const errorCount = response.hits.total.value;

      if (errorCount > alertParams.threshold) {
        function scheduleAction({
          serviceName,
          environment,
        }: {
          serviceName: string;
          environment?: string;
        }) {
          const alertInstanceName = [
            AlertType.ErrorCount,
            serviceName,
            environment,
          ]
            .filter((name) => name)
            .join('_');

          const alertInstance = services.alertInstanceFactory(
            alertInstanceName
          );
          alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
            serviceName,
            environment,
            threshold: alertParams.threshold,
            triggerValue: errorCount,
            interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
          });
        }
        response.aggregations?.services.buckets.forEach((serviceBucket) => {
          const serviceName = serviceBucket.key as string;
          if (isEmpty(serviceBucket.environments?.buckets)) {
            scheduleAction({ serviceName });
          } else {
            serviceBucket.environments.buckets.forEach((envBucket) => {
              const environment = envBucket.key as string;
              scheduleAction({ serviceName, environment });
            });
          }
        });
      }
    },
  });
}
