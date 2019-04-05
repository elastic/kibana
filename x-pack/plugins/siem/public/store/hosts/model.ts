/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KueryFilterQuery, SerializedFilterQuery } from '../model';

export enum HostsType {
  page = 'page',
  details = 'details',
}

export interface BasicQuery {
  limit: number;
}

interface Queries {
  authentications: BasicQuery;
  hosts: BasicQuery;
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
