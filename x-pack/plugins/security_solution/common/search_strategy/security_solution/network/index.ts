/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './common';
export * from './http';
export * from './tls';
export * from './top_countries';
export * from './top_n_flow';

export enum NetworkQueries {
  http = 'http',
  tls = 'tls',
  topCountries = 'topCountries',
  topNFlow = 'topNFlow',
}
