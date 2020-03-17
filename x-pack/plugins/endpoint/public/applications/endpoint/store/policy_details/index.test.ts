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
import { DepsStartMock, depsStartMock } from '../../mocks';
import { selectPolicyConfig } from './selectors';

describe('policy details store concerns', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let store: Store<PolicyDetailsState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<AppAction>;

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    store = createStore(
      policyDetailsReducer,
      applyMiddleware(policyDetailsMiddlewareFactory(fakeCoreStart, depsStart))
    );
    getState = store.getState;
    dispatch = store.dispatch;
  });

  test('it updates state on `userChangesPolicyConfig` action', async () => {
    const newPayload1 = {
      ...selectPolicyConfig(getState()),
    };
    newPayload1.windows.eventing.process = true;
    newPayload1.windows.eventing.network = false;

    dispatch({
      type: 'userChangedPolicyConfig',
      payload: { policyConfig: newPayload1 },
    });
    expect(selectPolicyConfig(getState()).windows.eventing.process).toEqual(true);
    expect(selectPolicyConfig(getState()).windows.eventing.network).toEqual(false);

    const newPayload2 = {
      ...selectPolicyConfig(getState()),
    };
    newPayload2.windows.eventing.process = false;
    newPayload2.windows.eventing.network = true;

    dispatch({
      type: 'userChangedPolicyConfig',
      payload: { policyConfig: newPayload2 },
    });
    expect(selectPolicyConfig(getState()).windows.eventing.process).toEqual(false);
    expect(selectPolicyConfig(getState()).windows.eventing.network).toEqual(true);
  });
});
