/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyDetailsState } from '../../types';
import { applyMiddleware, createStore, Dispatch, Store } from 'redux';
import { AppAction } from '../action';
import { policyDetailsReducer } from './reducer';
import { policyDetailsMiddlewareFactory } from './middleware';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { CoreStart } from 'kibana/public';

describe('policy details store concerns', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let store: Store<PolicyDetailsState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<AppAction>;

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    store = createStore(
      policyDetailsReducer,
      applyMiddleware(policyDetailsMiddlewareFactory(fakeCoreStart))
    );
    getState = store.getState;
    dispatch = store.dispatch;
  });

  test('it resets state on `userNavigatedFromPage` action', async () => {
    dispatch({
      type: 'serverReturnedPolicyDetailsData',
      payload: {
        policyItem: {
          name: 'New Policy',
          total: 1,
          pending: 1,
          failed: 1,
          id: '213',
          created_by: 'Me',
          created: '123',
          updated_by: 'Me',
          updated: '123',
        },
      },
    });
    dispatch({ type: 'userNavigatedFromPage', payload: 'policyDetailsPage' });
    expect(getState()).toEqual({
      policyItem: {
        name: '',
        total: 0,
        pending: 0,
        failed: 0,
        id: '',
        created_by: '',
        created: '',
        updated_by: '',
        updated: '',
      },
      isLoading: false,
    });
  });
});
