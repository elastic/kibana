/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * registering a new instance of the rule data client
 * in a new plugin will require updating the below data structure
 * to include the index name where the alerts as data will be written to.
 */
export const mapConsumerToIndexName = {
  apm: '.alerts-observability-apm',
  observability: '.alerts-observability',
  siem: ['.alerts-security-solution', '.siem-signals'],
};
export type ValidFeatureId = keyof typeof mapConsumerToIndexName;

export const validFeatureIds = Object.keys(mapConsumerToIndexName);
export const isValidFeatureId = (a: unknown): a is ValidFeatureId =>
  typeof a === 'string' && validFeatureIds.includes(a);
