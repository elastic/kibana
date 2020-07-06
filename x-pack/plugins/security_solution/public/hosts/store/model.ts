/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, HostsFields } from '../../graphql/types';

export enum HostsType {
  page = 'page',
  details = 'details',
}

export enum HostsTableType {
  authentications = 'authentications',
  hosts = 'allHosts',
  events = 'events',
  uncommonProcesses = 'uncommonProcesses',
  anomalies = 'anomalies',
  alerts = 'alerts',
}

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface HostsQuery extends BasicQueryPaginated {
  direction: Direction;
  sortField: HostsFields;
}

export interface Queries {
  [HostsTableType.authentications]: BasicQueryPaginated;
  [HostsTableType.hosts]: HostsQuery;
  [HostsTableType.events]: BasicQueryPaginated;
  [HostsTableType.uncommonProcesses]: BasicQueryPaginated;
  [HostsTableType.anomalies]: null | undefined;
  [HostsTableType.alerts]: BasicQueryPaginated;
}

export interface GenericHostsModel {
  queries: Queries;
}

export interface HostsModel {
  page: GenericHostsModel;
  details: GenericHostsModel;
}
