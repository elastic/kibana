/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { SecuritySubPluginWithStore } from '../../../app/types';
import { getPolicyDetailsRoutes } from './routes';
import { PolicyDetailsState } from './types';
import { Immutable } from '../../../../common/endpoint/types';
import { initialPolicyDetailsState, policyDetailsReducer } from './store/policy_details/reducer';
import { policyDetailsMiddlewareFactory } from './store/policy_details/middleware';
import { StartPlugins } from '../../../types';
import { substateMiddlewareFactory } from '../../../common/store';

export class EndpointPolicyDetails {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'policyDetails', Immutable<PolicyDetailsState>> {
    const { data, ingestManager } = plugins;
    const middleware = substateMiddlewareFactory(
      (globalState) => globalState.policyDetails,
      policyDetailsMiddlewareFactory(core, { data, ingestManager })
    );

    return {
      routes: getPolicyDetailsRoutes(),
      store: {
        initialState: {
          policyDetails: initialPolicyDetailsState(),
        },
        reducer: { policyDetails: policyDetailsReducer },
        middleware,
      },
    };
  }
}
