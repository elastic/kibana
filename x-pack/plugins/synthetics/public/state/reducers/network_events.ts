/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      total: number;
      loading: boolean;
      error?: Error;
      isWaterfallSupported: boolean;
      hasNavigationRequest?: boolean;
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
                  total: 0,
                  isWaterfallSupported: true,
                }
              : {
                  loading: true,
                  events: [],
                  total: 0,
                  isWaterfallSupported: true,
                },
          }
        : {
            [stepIndex]: {
              loading: true,
              events: [],
              total: 0,
              isWaterfallSupported: true,
            },
          },
    }),

    [String(getNetworkEventsSuccess)]: (
      state: NetworkEventsState,
      {
        payload: {
          events,
          total,
          checkGroup,
          stepIndex,
          isWaterfallSupported,
          hasNavigationRequest,
        },
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
                    total,
                    isWaterfallSupported,
                    hasNavigationRequest,
                  }
                : {
                    loading: false,
                    events,
                    total,
                    isWaterfallSupported,
                    hasNavigationRequest,
                  },
            }
          : {
              [stepIndex]: {
                loading: false,
                events,
                total,
                isWaterfallSupported,
                hasNavigationRequest,
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
                  total: 0,
                  error,
                  isWaterfallSupported: true,
                }
              : {
                  loading: false,
                  events: [],
                  total: 0,
                  error,
                  isWaterfallSupported: true,
                },
          }
        : {
            [stepIndex]: {
              loading: false,
              events: [],
              total: 0,
              error,
              isWaterfallSupported: true,
            },
          },
    }),
  },
  initialState
);
