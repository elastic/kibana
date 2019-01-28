/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KueryFilterQuery, SerializedFilterQuery } from '../model';

export interface BasicQuery {
  limit: number;
}
export interface HostsModel {
  query: {
    authentications: BasicQuery;
    hosts: BasicQuery;
    events: BasicQuery;
    uncommonProcesses: BasicQuery;
  };
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
}
