/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STORED_SCRIPTS_URL } from '../../../urls/risk_score';

export const createStoredScript = (options: { id: string; script: {} }) => {
  return cy.request({
    method: 'put',
    url: `${STORED_SCRIPTS_URL}/create`,
    body: options,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

const deleteStoredScript = (id: string) => {
  return cy.request({
    method: 'delete',
    url: `${STORED_SCRIPTS_URL}/delete`,
    body: { id },
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const deleteStoredScripts = async (scriptIds: string[]) => {
  await Promise.all(scriptIds.map((scriptId) => deleteStoredScript(scriptId)));
};
