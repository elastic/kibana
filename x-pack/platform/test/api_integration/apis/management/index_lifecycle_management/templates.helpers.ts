/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent as SuperTestAgent } from 'supertest';
import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }: { supertest: SuperTestAgent }) => {
  const loadTemplates = () => supertest.get(`${API_BASE_PATH}/templates?legacy=true`);

  const addPolicyToTemplate = (templateName: string, policyName: string, aliasName: string) =>
    supertest.post(`${API_BASE_PATH}/template?legacy=true`).set('kbn-xsrf', 'xxx').send({
      templateName,
      policyName,
      aliasName,
    });

  return {
    loadTemplates,
    addPolicyToTemplate,
  };
};
