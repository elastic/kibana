/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Cloud has its own system for managing SLM policies and we want to make
// this clear when Snapshot and Restore is used in a Cloud deployment.
// Retrieve the Cloud-managed policies so that UI can switch
// logical paths based on this information.
export const getManagedPolicyNames = async (callWithInternalUser: any): Promise<string[]> => {
  try {
    const { persistent, transient, defaults } = await callWithInternalUser('cluster.getSettings', {
      filterPath: '*.*managed_policies',
      flatSettings: true,
      includeDefaults: true,
    });
    const { 'cluster.metadata.managed_policies': managedPolicyNames = [] } = {
      ...defaults,
      ...persistent,
      ...transient,
    };
    return managedPolicyNames;
  } catch (e) {
    // Silently swallow error and return empty array for managed policy names
    // so that downstream calls are not blocked. In a healthy environment, we do
    // not expect to reach here.
    return [];
  }
};
