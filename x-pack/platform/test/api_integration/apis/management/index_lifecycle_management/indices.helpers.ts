/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent as SuperTestAgent } from 'supertest';
import { API_BASE_PATH } from './constants';
import { getRandomString } from './lib';

export const registerHelpers = ({ supertest }: { supertest: SuperTestAgent }) => {
  const addPolicyToIndex = (
    policyName: string,
    indexName: string,
    rolloverAlias = getRandomString()
  ) =>
    supertest.post(`${API_BASE_PATH}/index/add`).set('kbn-xsrf', 'xxx').send({
      indexName,
      policyName,
      alias: rolloverAlias,
    });

  const removePolicyFromIndex = (indexName: string | string[]) => {
    const indexNames = Array.isArray(indexName) ? indexName : [indexName];
    return supertest.post(`${API_BASE_PATH}/index/remove`).set('kbn-xsrf', 'xxx').send({
      indexNames,
    });
  };

  const retryPolicyOnIndex = (indexName: string | string[]) => {
    const indexNames = Array.isArray(indexName) ? indexName : [indexName];
    return supertest.post(`${API_BASE_PATH}/index/retry`).set('kbn-xsrf', 'xxx').send({
      indexNames,
    });
  };

  return {
    addPolicyToIndex,
    removePolicyFromIndex,
    retryPolicyOnIndex,
  };
};
