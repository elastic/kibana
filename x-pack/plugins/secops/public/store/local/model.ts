/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { inputsModel } from './inputs';
export { hostsModel } from './hosts';
export { networkModel } from './network';
export { timelineModel } from './timeline';

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

export interface SerializedFilterQuery {
  query: KueryFilterQuery;
  serializedQuery: string;
}
