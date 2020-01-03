/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { createStore, Store } from 'redux';
import { endpointAppReducers, GlobalState } from './index';
import { AppDispatch } from '../actions/app';

describe('app Reducers', () => {
  const objectThatLooksLikeAppState = expect.objectContaining({
    appBasePath: expect.stringMatching('/some/path'),
    coreStartServices: expect.objectContaining({
      application: expect.anything(),
      chrome: expect.anything(),
      docLinks: expect.anything(),
      http: expect.anything(),
      i18n: expect.anything(),
      notifications: expect.anything(),
      overlays: expect.anything(),
      uiSettings: expect.anything(),
      savedObjects: expect.anything(),
      injectedMetadata: expect.anything(),
    }),
  });

  let store: Store<GlobalState>;
  let dispatch: AppDispatch;

  beforeEach(() => {
    store = createStore(endpointAppReducers);
    dispatch = store.dispatch;
    dispatch({
      type: 'appWillMount',
      payload: {
        appBasePath: '/some/path',
        coreStartServices: coreMock.createStart({ basePath: '/some/path' }),
      },
    });
  });

  test('it stores kibana start/mount data on `appWillMount`', () => {
    expect(store.getState().app).toEqual(objectThatLooksLikeAppState);
  });

  test('it resets the store on `appDidUnmount`', () => {
    dispatch({
      type: 'appDidUnmount',
    });

    expect(store.getState().app).toEqual({
      appBasePath: '',
      coreStartServices: null,
    });
  });
});
