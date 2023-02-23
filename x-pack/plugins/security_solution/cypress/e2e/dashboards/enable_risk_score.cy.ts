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
  RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST,
  RISK_SCORE_INSTALLATION_SUCCESS_TOAST,
} from '../../screens/entity_analytics';
import {
  deleteRiskScore,
  intercepInstallRiskScoreModule,
  waitForInstallRiskScoreModule,
} from '../../tasks/api_calls/risk_scores';
import { findSavedObjects } from '../../tasks/api_calls/risk_scores/saved_objects';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { clickEnableRiskScore } from '../../tasks/risk_scores';
import { RiskScoreEntity } from '../../tasks/risk_scores/common';
import {
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  getTransformState,
} from '../../tasks/risk_scores/transforms';
import { ENTITY_ANALYTICS_URL } from '../../urls/navigation';

const spaceId = 'default';

describe('Enable risk scores', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'rule1');
  });

  beforeEach(() => {
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
    visit(ENTITY_ANALYTICS_URL);
  });

  afterEach(() => {
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
  });

  it('shows enable host risk button', () => {
    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('exist');
  });

  it('should install host risk score successfully', () => {
    intercepInstallRiskScoreModule();
    clickEnableRiskScore(RiskScoreEntity.host);
    waitForInstallRiskScoreModule();

    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.disabled');

    cy.get(RISK_SCORE_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.host)).should('exist');
    cy.get(RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.host)).should('exist');
    cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('not.exist');
    getTransformState(getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId)).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.transforms[0].id).to.eq(
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId)
      );
      expect(res.body.transforms[0].state).to.eq('started');
    });
    getTransformState(getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId)).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.transforms[0].id).to.eq(
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId)
      );
      expect(res.body.transforms[0].state).to.eq('started');
    });
    findSavedObjects(RiskScoreEntity.host, spaceId).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.saved_objects.length).to.eq(11);
    });
  });

  it('shows enable user risk button', () => {
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('exist');
  });

  it('should install user risk score successfully', () => {
    intercepInstallRiskScoreModule();
    clickEnableRiskScore(RiskScoreEntity.user);
    waitForInstallRiskScoreModule();

    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.disabled');

    cy.get(RISK_SCORE_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.user)).should('exist');

    cy.get(RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.user)).should('exist');
    cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('not.exist');
    getTransformState(getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId)).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.transforms[0].id).to.eq(
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId)
      );
      expect(res.body.transforms[0].state).to.eq('started');
    });
    getTransformState(getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId)).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.transforms[0].id).to.eq(
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId)
      );
      expect(res.body.transforms[0].state).to.eq('started');
    });

    findSavedObjects(RiskScoreEntity.user, spaceId).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.saved_objects.length).to.eq(11);
    });
  });
});
