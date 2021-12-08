/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AggregationFields {
  Users = 'users',
  Hosts = 'hosts',
}

export interface HostAggregate {
  name: string | undefined;
  id: string;
  count: number;
}

export interface UserAggregate {
  name: string;
  count: number;
}

export interface FrequencyResult {
  hosts?: HostAggregate[];
  users?: UserAggregate[];
}

export interface UniqueCountResult {
  totalHosts?: number;
  totalUsers?: number;
}
