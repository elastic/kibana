/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_BASE_PATH } from '../constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function enrichPoliciesApi(getService: FtrProviderContext['getService']) {
  const supertest = getService('supertest');

  const getAllEnrichPolicies = () =>
    supertest
      .get(`${INTERNAL_API_BASE_PATH}/enrich_policies`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  const executeEnrichPolicy = (name: string) =>
    supertest
      .put(`${INTERNAL_API_BASE_PATH}/enrich_policies/${name}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  const removeEnrichPolicy = (name: string) =>
    supertest
      .delete(`${INTERNAL_API_BASE_PATH}/enrich_policies/${name}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  return {
    getAllEnrichPolicies,
    removeEnrichPolicy,
    executeEnrichPolicy,
  };
}
