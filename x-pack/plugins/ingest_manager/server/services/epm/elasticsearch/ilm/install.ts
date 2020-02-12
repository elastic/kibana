/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallESAsCurrentUser } from '../../cluster_access';
import { getPolicy } from './ilm';

export async function installILMPolicy(name: string, callCluster: CallESAsCurrentUser) {
  // TODO: This should be in the end loaded from the base package instead of being hardcoded
  const policy = getPolicy();

  const data = await callCluster('transport.request', {
    method: 'PUT',
    path: '/_ilm/policy/' + name,
    body: policy,
  });
  // TODO: Check if policy was created as expected

  return data;
}

export async function policyExists(
  name: string,
  callCluster: CallESAsCurrentUser
): Promise<boolean> {
  const response = await callCluster('transport.request', {
    method: 'GET',
    path: '/_ilm/policy/?filter_path=' + name,
  });

  // If the response contains a key, it means the policy exists
  return Object.keys(response).length > 0;
}
