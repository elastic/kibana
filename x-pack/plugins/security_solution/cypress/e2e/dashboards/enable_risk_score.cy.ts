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
import {
  deleteRiskScore,
  RiskScoreEntity,
  getTransformState,
  getRiskScorePivotTransformId,
  getRiskScoreLatestTransformId,
  findSavedObject,
} from '../../tasks/risk_scores';
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
    // deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId: 'default', deleteAll: true });
    // deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId: 'default', deleteAll: true });
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
    getTransformState(getRiskScorePivotTransformId(RiskScoreEntity.host, 'default')).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.transforms[0].id).to.eq(
        getRiskScorePivotTransformId(RiskScoreEntity.host, 'default')
      );
      expect(res.body.transforms[0].state).to.eq('started');
    });
    getTransformState(getRiskScoreLatestTransformId(RiskScoreEntity.host, 'default')).then(
      (res) => {
        expect(res.status).to.eq(200);
        expect(res.body.transforms[0].id).to.eq(
          getRiskScoreLatestTransformId(RiskScoreEntity.host, 'default')
        );
        expect(res.body.transforms[0].state).to.eq('started');
      }
    );
  });

  it.only('shows enable user risk button', () => {
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('exist');
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).click();
  });

  it.only('starts installing user risk score', () => {
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.disabled');
  });

  it.only('should install user risk score successfully', (done) => {
    // cy.intercept({
    //   method: 'POST',
    //   url: `/internal/risk_score/prebuilt_content/saved_objects/_bulk_create/${RiskScoreEntity.user}RiskScoreDashboards`,
    // }).as('createSavedObjects');

    // cy.wait(['@createSavedObjects'], { timeout: 500000 });
    cy.get(`[data-test-subj="${RiskScoreEntity.user}RiskScoreDashboardsSuccessToast"]`).should(
      'exist'
    );
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('not.exist');
    getTransformState(getRiskScorePivotTransformId(RiskScoreEntity.user, 'default')).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.transforms[0].id).to.eq(
        getRiskScorePivotTransformId(RiskScoreEntity.user, 'default')
      );
      expect(res.body.transforms[0].state).to.eq('started');
    });
    getTransformState(getRiskScoreLatestTransformId(RiskScoreEntity.user, 'default')).then(
      (res) => {
        expect(res.status).to.eq(200);
        expect(res.body.transforms[0].id).to.eq(
          getRiskScoreLatestTransformId(RiskScoreEntity.user, 'default')
        );
        expect(res.body.transforms[0].state).to.eq('started');
      }
    );

    findSavedObject(RiskScoreEntity.user, 'default').then((res) => {
      expect(res.status).to.eq(200);
      console.log('----2---', res);

      expect(res.body.saved_objects.length).to.eq(11);
      done();
    });
  });
});
