/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, HostsFields } from '../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';

export enum HostsType {
  page = 'page',
  details = 'details',
}

export enum HostsTableType {
  authentications = 'authentications',
  hosts = 'hosts',
  events = 'events',
  uncommonProcesses = 'uncommonProcesses',
}

export interface BasicQuery {
  limit: number;
  activePage: number;
}

export interface HostsQuery extends BasicQuery {
  direction: Direction;
  sortField: HostsFields;
}

interface Queries {
  authentications: BasicQuery;
  hosts: HostsQuery;
  events: BasicQuery;
  uncommonProcesses: BasicQuery;
}

export interface GenericHostsModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  queries: Queries;
}

export interface HostsModel {
  page: GenericHostsModel;
  details: GenericHostsModel;
}
