/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './all';
export * from './common';
export * from './overview';
export * from './first_last_seen';

export enum HostsQueries {
  authentications = 'authentications',
  firstLastSeen = 'firstLastSeen',
  hosts = 'hosts',
  hostOverview = 'hostOverview',
}
