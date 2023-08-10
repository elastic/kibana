/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

export const fetchAllEnrichPolicies = (client: IScopedClusterClient) => {
  return client.asCurrentUser.enrich.getPolicy();
};

export const executeEnrichPolicy = (client: IScopedClusterClient, policyName: string) => {
  return client.asCurrentUser.enrich.executePolicy({ name: policyName });
};

export const deleteEnrichPolicy = (client: IScopedClusterClient, policyName: string) => {
  return client.asCurrentUser.enrich.deletePolicy({ name: policyName });
};
