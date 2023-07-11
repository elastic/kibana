/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { NetworkEvent } from '../../../../../common/runtime_types';
import { getNetworkEvents } from './actions';

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

export const networkEventsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getNetworkEvents.get, (state, action) => {
      const { checkGroup, stepIndex } = action.payload;
      state[checkGroup] = state[checkGroup]
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
          };
    })
    .addCase(getNetworkEvents.success, (state, action) => {
      const { events, total, checkGroup, stepIndex, isWaterfallSupported, hasNavigationRequest } =
        action.payload;

      state[checkGroup] = state[checkGroup]
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
          };
    })
    .addCase(getNetworkEvents.fail, (state, action) => {
      const { checkGroup, stepIndex, error } = action.payload;
      state[checkGroup] = state[checkGroup]
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
          };
    });
});
