/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum QueryKeys {
  FetchIndex = 'fetchIndex',
  FetchSearchIndicesStatus = 'fetchSearchIndicesStatus',
  FetchUserStartPrivileges = 'fetchUserStartPrivileges',
}

export enum MutationKeys {
  SearchIndicesCreateIndex = 'searchIndicesCreateIndex',
}

export const ELASTICSEARCH_URL_PLACEHOLDER = 'https://your_deployment_url';
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';
export const INDEX_PLACEHOLDER = 'my-index';

export enum Tabs {
  Data = 'data',
  Mappings = 'mappings',
}
