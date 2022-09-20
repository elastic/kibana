/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  ENABLE_HOST_RISK_SCORE_BUTTON,
  ENABLE_USER_RISK_SCORE_BUTTON,
} from '../../screens/entity_analytics';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { deleteRiskScore, RiskScoreEntity } from '../../tasks/risk_scores';
import { ENTITY_ANALYTICS_URL } from '../../urls/navigation';

describe('Enable hosts risk score', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'rule1');
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId: 'default', deleteAll: true });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId: 'default', deleteAll: true });

    visit(ENTITY_ANALYTICS_URL);
  });

  after(() => {
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId: 'default', deleteAll: true });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId: 'default', deleteAll: true });
  });

  it('shows enable host risk button', () => {
    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('exist');
    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).click();
  });

  it('starts installing host risk score', () => {
    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.disabled');
  });

  it('should install host risk score successfully', () => {
    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('not.exist');
  });

  it('shows enable user risk button', () => {
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('exist');
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).click();
  });

  it('starts installing user risk score', () => {
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.disabled');
  });

  it('should install user risk score successfully', () => {
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('not.exist');
  });
});
