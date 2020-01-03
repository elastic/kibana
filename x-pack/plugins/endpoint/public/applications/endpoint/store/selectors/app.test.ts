/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { endpointAppReducers, GlobalState } from '../reducers';
import { createStore, Store } from 'redux';
import { coreStartServices, appBasePath } from './app';
import { AppDispatch } from '../actions/app';
import { CoreStart } from 'kibana/public';

describe('app selectors', () => {
  let store: Store<GlobalState>;
  let dispatch: AppDispatch;
  const setupStore = () => {
    store = createStore(endpointAppReducers);
    dispatch = store.dispatch;
  };

  describe('before `appWillMount` action', () => {
    let state: GlobalState;

    beforeEach(() => {
      setupStore();
      state = store.getState();
    });

    test('coreStartServices is initially null', () => {
      expect(coreStartServices(state)).toBeNull();
    });

    test('appBasePath is initially empty string', () => {
      expect(appBasePath(state)).toEqual('');
    });
  });

  describe('after `appWillMount` action', () => {
    let coreStartServicesMock: CoreStart;

    beforeEach(() => {
      setupStore();
      coreStartServicesMock = coreMock.createStart({ basePath: '/some/path' });
      dispatch({
        type: 'appWillMount',
        payload: {
          appBasePath: '/some/path',
          coreStartServices: coreStartServicesMock,
        },
      });
    });

    test('coreStartServices set to an object', () => {
      expect(coreStartServices(store.getState())).toEqual(coreStartServicesMock);
    });

    test('appBasePath is set', () => {
      expect(appBasePath(store.getState())).toEqual('/some/path');
    });
  });
});
