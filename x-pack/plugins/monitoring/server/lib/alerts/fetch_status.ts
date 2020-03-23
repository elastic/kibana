/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { get } from 'lodash';
import { AlertClusterState } from '../../alerts/types';
import { ALERT_TYPES, LOGGING_TAG } from '../../../common/constants';

export async function fetchStatus(
  callCluster: any,
  start: number,
  end: number,
  clusterUuid: string,
  server: any
): Promise<any[]> {
  // TODO: this shouldn't query task manager directly but rather
  // use an api exposed by the alerting/actions plugin
  // See https://github.com/elastic/kibana/issues/48442
  const statuses = await Promise.all(
    ALERT_TYPES.map(
      type =>
        new Promise(async (resolve, reject) => {
          try {
            const params = {
              index: '.kibana_task_manager',
              filterPath: ['hits.hits._source.task.state'],
              body: {
                size: 1,
                sort: [{ updated_at: { order: 'desc' } }],
                query: {
                  bool: {
                    filter: [
                      {
                        term: {
                          'task.taskType': `alerting:${type}`,
                        },
                      },
                    ],
                  },
                },
              },
            };

            const response = await callCluster('search', params);
            const state = get(response, 'hits.hits[0]._source.task.state', '{}');
            const clusterState: AlertClusterState = get<AlertClusterState>(
              JSON.parse(state),
              `alertTypeState.${clusterUuid}`,
              {
                expiredCheckDateMS: 0,
                ui: {
                  isFiring: false,
                  message: null,
                  severity: 0,
                  resolvedMS: 0,
                  expirationTime: 0,
                },
              }
            );
            const isInBetween = moment(clusterState.ui.resolvedMS).isBetween(start, end);
            if (clusterState.ui.isFiring || isInBetween) {
              return resolve({
                type,
                ...clusterState.ui,
              });
            }
            return resolve(false);
          } catch (err) {
            const reason = get(err, 'body.error.type');
            if (reason === 'index_not_found_exception') {
              server.log(
                ['error', LOGGING_TAG],
                `Unable to fetch alerts. Alerts depends on task manager, which has not been started yet.`
              );
            } else {
              server.log(['error', LOGGING_TAG], err.message);
            }
            return resolve(false);
          }
        })
    )
  );

  return statuses.filter(Boolean);
}
