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
import { selectPolicyConfig, selectWindowsEventing } from './selectors';
import { clone } from '../../models/policy_details_config';

describe('policy details: ', () => {
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

  describe('when the user has enabled windows process eventing', () => {
    beforeEach(() => {
      const policyConfig = selectPolicyConfig(getState());
      if (!policyConfig) {
        throw new Error();
      }

      const newPayload1 = clone(policyConfig);
      newPayload1.windows.eventing.process = true;

      dispatch({
        type: 'userChangedPolicyConfig',
        payload: { policyConfig: newPayload1 },
      });
    });

    it('windows process eventing is enabled', async () => {
      expect(selectWindowsEventing(getState())!.process).toEqual(true);
    });
  });
});
