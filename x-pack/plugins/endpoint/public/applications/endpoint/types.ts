/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { EndpointListState } from './store/endpoint_list';
import { AppAction } from './store/action';
import { AlertResultList } from '../../../common/types';

export type MiddlewareFactory = (
  coreStart: CoreStart
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, GlobalState>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export interface GlobalState {
  readonly endpointList: EndpointListState;
  readonly alertList: AlertListState;
}

export type AlertListData = AlertResultList;
export type AlertListState = AlertResultList;
