/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_SCORE_SAVED_OBJECTS_URL, SAVED_OBJECTS_URL } from '../../../urls/risk_score';
import type { RiskScoreEntity } from '../../risk_scores/common';
import { getRiskScoreTagName } from '../../risk_scores/saved_objects';

export const deleteSavedObjects = (templateName: `${RiskScoreEntity}RiskScoreDashboards`) => {
  return cy.request({
    method: 'post',
    url: `${RISK_SCORE_SAVED_OBJECTS_URL}/_bulk_delete/${templateName}`,
    failOnStatusCode: false,
    body: {
      deleteAll: true,
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const findSavedObjects = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') => {
  const search = getRiskScoreTagName(riskScoreEntity, spaceId);

  const getReference = (tagId: string) => encodeURIComponent(`[{"type":"tag","id":"${tagId}"}]`);

  return cy
    .request({
      method: 'get',
      url: `${SAVED_OBJECTS_URL}/_find?fields=id&type=tag&sort_field=updated_at&search=${search}&search_fields=name`,
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    })
    .then((res) =>
      cy.request({
        method: 'get',
        url: `${SAVED_OBJECTS_URL}/_find?fields=id&type=index-pattern&type=tag&type=visualization&type=dashboard&type=lens&sort_field=updated_at&has_reference=${getReference(
          res.body.saved_objects[0].id
        )}`,
        headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      })
    );
};
