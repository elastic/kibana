/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICES_URL } from '../../../urls/risk_score';
import type { RiskScoreEntity } from '../../risk_scores/common';
import { getLatestTransformIndex, getPivotTransformIndex } from '../../risk_scores/indices';

export const createIndex = (options: {
  index: string;
  mappings: string | Record<string, unknown>;
}) => {
  return cy.request({
    method: 'put',
    url: `${INDICES_URL}/create`,
    body: options,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const deleteRiskScoreIndicies = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') => {
  return cy
    .request({
      method: 'post',
      url: `${INDICES_URL}/delete`,
      body: {
        indices: [getPivotTransformIndex(riskScoreEntity, spaceId)],
      },
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      failOnStatusCode: false,
    })
    .then(() => {
      return cy.request({
        method: 'post',
        url: `${INDICES_URL}/delete`,
        body: {
          indices: [getLatestTransformIndex(riskScoreEntity, spaceId)],
        },
        headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
        failOnStatusCode: false,
      });
    });
};
