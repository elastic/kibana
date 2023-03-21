/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INGEST_PIPELINES_URL } from '../../../urls/risk_score';

export const createIngestPipeline = (options: { name: string; processors: Array<{}> }) => {
  return cy.request({
    method: 'post',
    url: `${INGEST_PIPELINES_URL}`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body: options,
  });
};

export const deleteRiskScoreIngestPipelines = (names: string[]) => {
  return cy.request({
    method: 'delete',
    url: `${INGEST_PIPELINES_URL}/${names.join(',')}`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
  });
};
