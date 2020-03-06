/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import {
  ESSearchResponse,
  ESSearchRequest
} from '../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { AlertingPlugin } from '../../../../alerting/server';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { APMConfig } from '../..';

interface RegisterAlertParams {
  alerting: AlertingPlugin['setup'];
  config$: Observable<APMConfig>;
}

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  window: schema.string(),
  threshold: schema.number()
});

export function registerErrorRateAlertType({
  alerting,
  config$
}: RegisterAlertParams) {
  alerting.registerType({
    id: AlertType.ErrorRate,
    name: ALERT_TYPES_CONFIG['apm.error_rate'].name,
    actionGroups:
      ALERT_TYPES_CONFIG[AlertType.TransactionDuration].actionGroups,
    defaultActionGroupId:
      ALERT_TYPES_CONFIG[AlertType.TransactionDuration].defaultActionGroupId,
    validate: {
      params: paramsSchema
    },

    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();

      const alertParams = params as TypeOf<typeof paramsSchema>;

      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient
      });

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
                      gte: `now-${alertParams.window}`
                    }
                  }
                },
                {
                  term: {
                    [PROCESSOR_EVENT]: 'error'
                  }
                },
                {
                  term: {
                    [SERVICE_NAME]: alertParams.serviceName
                  }
                },
                {
                  term: {
                    [TRANSACTION_TYPE]: alertParams.transactionType
                  }
                }
              ]
            }
          },
          track_total_hits: true
        }
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
        alertInstance.scheduleActions(
          ALERT_TYPES_CONFIG['apm.error_rate'].defaultActionGroupId
        );
      }

      return {};
    }
  });
}
