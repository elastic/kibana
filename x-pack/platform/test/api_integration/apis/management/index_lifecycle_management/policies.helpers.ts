/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import type { Agent as SuperTestAgent } from 'supertest';
import { API_BASE_PATH, DEFAULT_POLICY_NAME } from './constants';
import { getPolicyNames } from './lib';

interface IlmPolicyPayload extends IlmPolicy {
  name: string;
}

export const registerHelpers = ({ supertest }: { supertest: SuperTestAgent }) => {
  const loadPolicies = (withIndices = false) =>
    withIndices
      ? supertest.get(`${API_BASE_PATH}/policies?withIndices=true`)
      : supertest.get(`${API_BASE_PATH}/policies`);

  const createPolicy = (policy: IlmPolicyPayload) => {
    return supertest.post(`${API_BASE_PATH}/policies`).set('kbn-xsrf', 'xxx').send(policy);
  };

  const deletePolicy = (name: string) => {
    return supertest.delete(`${API_BASE_PATH}/policies/${name}`).set('kbn-xsrf', 'xxx');
  };

  const deleteAllPolicies = (policies: string[]) => Promise.all(policies.map(deletePolicy));

  const cleanUp = () => {
    return loadPolicies()
      .then(({ body }) => getPolicyNames(body).filter((name) => name !== DEFAULT_POLICY_NAME))
      .then(deleteAllPolicies);
  };

  return {
    cleanUp,
    loadPolicies,
    createPolicy,
    deletePolicy,
  };
};
