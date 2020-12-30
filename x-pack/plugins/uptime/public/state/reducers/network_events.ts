/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { NetworkEvent, SyntheticsNetworkEventsApiResponse } from '../../../common/runtime_types';
import {
  FetchNetworkEventsParams,
  FetchNetworkEventsFailPayload,
  getNetworkEvents,
  getNetworkEventsFail,
  getNetworkEventsSuccess,
} from '../actions/network_events';

export interface NetworkEventsState {
  [checkGroup: string]: {
    [stepIndex: number]: {
      events: NetworkEvent[];
      loading: boolean;
      error?: Error;
    };
  };
}

const initialState: NetworkEventsState = {};

type Payload = FetchNetworkEventsParams &
  SyntheticsNetworkEventsApiResponse &
  FetchNetworkEventsFailPayload &
  string[];

export const networkEventsReducer = handleActions<NetworkEventsState, Payload>(
  {
    [String(getNetworkEvents)]: (
      state: NetworkEventsState,
      { payload: { checkGroup, stepIndex } }: Action<FetchNetworkEventsParams>
    ) => ({
      ...state,
      [checkGroup]: state[checkGroup]
        ? {
            [stepIndex]: state[checkGroup][stepIndex]
              ? {
                  ...state[checkGroup][stepIndex],
                  loading: true,
                  events: [],
                }
              : {
                  loading: true,
                  events: [],
                },
          }
        : {
            [stepIndex]: {
              loading: true,
              events: [],
            },
          },
    }),

    [String(getNetworkEventsSuccess)]: (
      state: NetworkEventsState,
      {
        payload: { events, checkGroup, stepIndex },
      }: Action<SyntheticsNetworkEventsApiResponse & FetchNetworkEventsParams>
    ) => {
      return {
        ...state,
        [checkGroup]: state[checkGroup]
          ? {
              [stepIndex]: state[checkGroup][stepIndex]
                ? {
                    ...state[checkGroup][stepIndex],
                    loading: false,
                    events,
                  }
                : {
                    loading: false,
                    events,
                  },
            }
          : {
              [stepIndex]: {
                loading: false,
                events,
              },
            },
      };
    },

    [String(getNetworkEventsFail)]: (
      state: NetworkEventsState,
      { payload: { checkGroup, stepIndex, error } }: Action<FetchNetworkEventsFailPayload>
    ) => ({
      ...state,
      [checkGroup]: state[checkGroup]
        ? {
            [stepIndex]: state[checkGroup][stepIndex]
              ? {
                  ...state[checkGroup][stepIndex],
                  loading: false,
                  events: [],
                  error,
                }
              : {
                  loading: false,
                  events: [],
                  error,
                },
          }
        : {
            [stepIndex]: {
              loading: false,
              events: [],
              error,
            },
          },
    }),
  },
  initialState
);
