/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostState } from '../types';
import { ImmutableReducer } from '../../common/store';
import { AppAction } from '../../common/store/actions';
import { Immutable } from '../../../common/endpoint/types';

export { hostListReducer } from './reducer';
export { HostAction } from './action';
export { hostMiddlewareFactory } from './middleware';

export interface EndpointHostsPluginState {
  hostList: Immutable<HostState>;
}

export interface EndpointHostsPluginReducer {
  hostList: ImmutableReducer<HostState, AppAction>;
}
