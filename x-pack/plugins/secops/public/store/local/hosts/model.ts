/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface BasicQuery {
  limit: number;
}
export interface InMemoryPaginationQuery extends BasicQuery {
  upperLimit: number;
}

export interface HostsModel {
  query: {
    hosts: BasicQuery;
    uncommonProcesses: InMemoryPaginationQuery;
  };
}
