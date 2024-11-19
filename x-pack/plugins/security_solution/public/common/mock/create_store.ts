/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, Middleware } from 'redux';
import { SUB_PLUGINS_REDUCER } from './utils';
import type { State } from '../store';
import { createStore } from '../store';
import { mockGlobalState } from './global_state';
import type { AppAction } from '../store/actions';
import type { Immutable } from '../../../common/endpoint/types';
import type { StartServices } from '../../types';
import { createSecuritySolutionStorageMock } from './mock_local_storage';

const { storage: storageMock } = createSecuritySolutionStorageMock();

const kibanaMock = {} as unknown as StartServices;

export const createMockStore = (
  state: State = mockGlobalState,
  pluginsReducer: typeof SUB_PLUGINS_REDUCER = SUB_PLUGINS_REDUCER,
  kibana: typeof kibanaMock = kibanaMock,
  storage: typeof storageMock = storageMock,
  additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>
) => {
  return createStore(state, pluginsReducer, kibana, storage, additionalMiddleware);
};
