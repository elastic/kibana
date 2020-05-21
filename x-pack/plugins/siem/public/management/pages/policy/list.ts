/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { SecuritySubPluginWithStore } from '../../../app/types';
import { getPolicyListRoutes } from './routes';
import { PolicyListState } from './types';
import { Immutable } from '../../../../common/endpoint/types';
import { initialPolicyListState, policyListReducer } from './store/policy_list/reducer';
import { policyListMiddlewareFactory } from './store/policy_list/middleware';
import { StartPlugins } from '../../../types';
import { substateMiddlewareFactory } from '../../../common/store';

export class EndpointPolicyList {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'policyList', Immutable<PolicyListState>> {
    const { data, ingestManager } = plugins;
    const middleware = substateMiddlewareFactory(
      (globalState) => globalState.policyList,
      policyListMiddlewareFactory(core, { data, ingestManager })
    );

    return {
      routes: getPolicyListRoutes(),
      store: {
        initialState: {
          policyList: initialPolicyListState(),
        },
        reducer: { policyList: policyListReducer },
        middleware,
      },
    };
  }
}
