/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './common';
export * from './details';
export * from './dns';
export * from './http';
export * from './kpi';
export * from './overview';
export * from './tls';
export * from './top_countries';
export * from './top_n_flow';
export * from './users';

export enum NetworkQueries {
  details = 'networkDetails',
  dns = 'dns',
  http = 'http',
  overview = 'overviewNetwork',
  tls = 'tls',
  topCountries = 'topCountries',
  topNFlow = 'topNFlow',
  users = 'users',
}
