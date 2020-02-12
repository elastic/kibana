/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { Query, TimeRange, IIndexPattern, esFilters } from 'src/plugins/data/public';
import { EndpointListState } from './store/endpoint_list';
import { AppAction } from './store/action';
import { AlertResultList } from '../../../common/types';
import { EndpointPluginStartDependencies } from '../../plugin';

export type MiddlewareFactory = (
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, GlobalState>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export interface GlobalState {
  readonly endpointList: EndpointListState;
  readonly alertList: AlertListState;
}

interface AlertsSearchBarState {
  patterns: IIndexPattern[];
  query: Query;
  dateRange: TimeRange;
  filters: esFilters.Filter[];
}

export interface UserUpdatedAlertsSearchBarFilterPayload {
  query?: Query;
  filters?: esFilters.Filter[];
  dateRange?: TimeRange;
}

export type AlertListData = AlertResultList;
export type AlertListState = AlertResultList & { searchBar: AlertsSearchBarState };
