/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyData, PolicyDetailsState } from '../../types';
import { policyIdFromParams, isOnPolicyDetailsPage, policyDetails } from './selectors';
import {
  sendGetDatasource,
  sendGetFleetAgentStatusForConfig,
  sendPutDatasource,
  UpdateDatasourceResponse,
} from '../../services/ingest';

export const policyDetailsMiddlewareFactory: MiddlewareFactory<PolicyDetailsState> = coreStart => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => next => async action => {
    next(action);
    const state = getState();

    if (action.type === 'userChangedUrl' && isOnPolicyDetailsPage(state)) {
      const id = policyIdFromParams(state);
      const { item: policyItem } = await sendGetDatasource(http, id);

      // FIXME: remove this code once the Default Policy is available in the endpoint package
      // Until we get the Default configuration into the Enpoint package so that the datasource has
      // the expected data structure, we will add it here manually.
      if (!policyItem.inputs.length) {
        policyItem.inputs = [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              policy: {
                value: {},
              },
            },
          },
        ];
      }

      dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
          policyConfig: {
            windows: {
              malware: {
                mode: 'detect',
              },
              eventing: {
                process: true,
                network: true,
              },
            },
            mac: {},
            linux: {},
          },
        },
      });

      // Agent summary is secondary data, so its ok for it to come after the details
      // page is populated with the main content
      // FIXME: need to only do this IF fleet is enabled
      if (policyItem.config_id) {
        const { results } = await sendGetFleetAgentStatusForConfig(http, policyItem.config_id);
        dispatch({
          type: 'serverReturnedPolicyDetailsAgentSummaryData',
          payload: {
            agentStatusSummary: results,
          },
        });
      }
    } else if (action.type === 'userClickedPolicyDetailsSaveButton') {
      const { id, revision, ...updatedPolicyItem } = policyDetails(state) as PolicyData;
      const updatedPolicyConfig = {
        // FIXME: use Candace's selector here
        windows: {
          events: {
            process: true,
          },
          malware: {
            mode: 'prevent',
          },
          logging: {
            stdout: 'debug',
            file: 'info',
          },
          advanced: {
            elasticsearch: {
              indices: {
                control: 'control-index',
                event: 'event-index',
                logging: 'logging-index',
              },
              kernel: {
                connect: true,
                process: true,
              },
            },
          },
        },
        mac: {
          events: {
            process: true,
          },
          malware: {
            mode: 'detect',
          },
          logging: {
            stdout: 'debug',
            file: 'info',
          },
          advanced: {
            elasticsearch: {
              indices: {
                control: 'control-index',
                event: 'event-index',
                logging: 'logging-index',
              },
              kernel: {
                connect: true,
                process: true,
              },
            },
          },
        },
        linux: {
          events: {
            process: true,
          },
          logging: {
            stdout: 'debug',
            file: 'info',
          },
          advanced: {
            elasticsearch: {
              indices: {
                control: 'control-index',
                event: 'event-index',
                logging: 'logging-index',
              },
              kernel: {
                connect: true,
                process: true,
              },
            },
          },
        },
      };

      updatedPolicyItem.inputs[0].config.policy.value = updatedPolicyConfig;

      let apiResponse: UpdateDatasourceResponse;
      try {
        apiResponse = await sendPutDatasource(http, id, updatedPolicyItem);
      } catch (error) {
        dispatch({
          type: 'serverReturnedPolicyDetailsUpdateFailure',
          payload: {
            success: false,
            error: error.body || error,
          },
        });
        return;
      }

      dispatch({
        type: 'serverReturnedUpdatedPolicyDetailsData',
        payload: {
          policyItem: apiResponse.item,
          updateStatus: {
            success: true,
          },
        },
      });
    }
  };
};
