/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyDetailsState } from '../../types';
import { createStore, Dispatch, Store } from 'redux';
import { policyDetailsReducer, PolicyDetailsAction } from './index';
import { policyConfig } from './selectors';
import { clone } from '../../models/policy_details_config';
import { generatePolicy } from '../../models/policy';

describe('policy details: ', () => {
  let store: Store<PolicyDetailsState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<PolicyDetailsAction>;

  beforeEach(() => {
    store = createStore(policyDetailsReducer);
    getState = store.getState;
    dispatch = store.dispatch;

    dispatch({
      type: 'serverReturnedPolicyDetailsData',
      payload: {
        policyItem: {
          id: '',
          name: '',
          description: '',
          config_id: '',
          enabled: true,
          output_id: '',
          inputs: [
            {
              type: 'endpoint',
              enabled: true,
              streams: [],
              config: {
                policy: {
                  value: generatePolicy(),
                },
              },
            },
          ],
          namespace: '',
          package: {
            name: '',
            title: '',
            version: '',
          },
          revision: 1,
        },
      },
    });
  });

  describe('when the user has enabled windows process events', () => {
    beforeEach(() => {
      const config = policyConfig(getState());
      if (!config) {
        throw new Error();
      }

      const newPayload1 = clone(config);
      newPayload1.windows.events.process = true;

      dispatch({
        type: 'userChangedPolicyConfig',
        payload: { policyConfig: newPayload1 },
      });
    });

    it('windows process events is enabled', () => {
      const config = policyConfig(getState());
      expect(config!.windows.events.process).toEqual(true);
    });
  });

  describe('when the user has enabled mac file events', () => {
    beforeEach(() => {
      const config = policyConfig(getState());
      if (!config) {
        throw new Error();
      }

      const newPayload1 = clone(config);
      newPayload1.mac.events.file = true;

      dispatch({
        type: 'userChangedPolicyConfig',
        payload: { policyConfig: newPayload1 },
      });
    });

    it('mac file events is enabled', () => {
      const config = policyConfig(getState());
      expect(config!.mac.events.file).toEqual(true);
    });
  });
});
