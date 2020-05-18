/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertListState, Immutable } from '../../../common/endpoint_alerts/types';
import { ImmutableReducer } from '../../common/store';
import { AppAction } from '../../common/store/actions';

export { alertListReducer } from './reducer';
export { AlertAction } from './action';

export interface EndpointAlertsPluginState {
  alertList: Immutable<AlertListState>;
}

export interface EndpointAlertsPluginReducer {
  alertList: ImmutableReducer<AlertListState, AppAction>;
}
