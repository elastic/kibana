/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  RiskScoreEntity,
  RISK_SCORE_INSTALLATION_SUCCESS_TOAST,
  UPGRADE_HOST_RISK_SCORE_BUTTON,
  UPGRADE_USER_RISK_SCORE_BUTTON,
  UPGRADE_CANCELLATION_BUTTON,
  UPGRADE_CONFIRMARION_MODAL,
  UPGRADE_CONFIRMATION_BUTTON,
} from '../../screens/entity_analytics';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { deleteRiskScore, installLegacyRiskScoreModule } from '../../tasks/risk_scores';
import { findSavedObjects } from '../../tasks/risk_scores/saved_objects';
import { getTransformState } from '../../tasks/risk_scores/transforms';
import { ENTITY_ANALYTICS_URL } from '../../urls/navigation';

const spaceId = 'default';

describe('Upgrade risk scores', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'rule1');
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId, deleteAll: true });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId, deleteAll: true });
    installLegacyRiskScoreModule(RiskScoreEntity.host, spaceId);
    installLegacyRiskScoreModule(RiskScoreEntity.user, spaceId);
    visit(ENTITY_ANALYTICS_URL);
  });

  after(() => {
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId, deleteAll: true });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId, deleteAll: true });
  });

  it('shows upgrade host risk button', () => {
    cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('be.visible');
    cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).click();
  });

  it('should show a confirmation modal for upgrading host risk score', () => {
    cy.get(UPGRADE_CONFIRMARION_MODAL(RiskScoreEntity.host)).should('exist');
  });

  it('display a link to host risk score Elastic doc', () => {
    cy.get(UPGRADE_CANCELLATION_BUTTON)
      .get(`${UPGRADE_CONFIRMARION_MODAL(RiskScoreEntity.host)} a`)
      .then((link) => {
        expect(link.prop('href')).to.eql(
          `https://www.elastic.co/guide/en/security/current/${RiskScoreEntity.host}-risk-score.html`
        );
      });
  });

  it('starts upgrading host risk score', () => {
    cy.get(UPGRADE_CONFIRMATION_BUTTON).click();
    cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('be.disabled');
  });

  it('should upgrade host risk score successfully', () => {
    cy.get(RISK_SCORE_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.host)).should('exist');
    cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('not.exist');
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

  it('shows upgrade user risk button', () => {
    cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('be.visible');
    cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).click();
  });

  it('should show a confirmation modal for upgrading user risk score', () => {
    cy.get(UPGRADE_CONFIRMARION_MODAL(RiskScoreEntity.user)).should('exist');
  });

  it('display a link to user risk score Elastic doc', () => {
    cy.get(UPGRADE_CANCELLATION_BUTTON)
      .get(`${UPGRADE_CONFIRMARION_MODAL(RiskScoreEntity.user)} a`)
      .then((link) => {
        expect(link.prop('href')).to.eql(
          `https://www.elastic.co/guide/en/security/current/${RiskScoreEntity.user}-risk-score.html`
        );
      });
  });

  it('starts upgrading user risk score', () => {
    cy.get(UPGRADE_CONFIRMATION_BUTTON).click();
    cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('be.disabled');
  });

  it('should upgrade user risk score successfully', () => {
    cy.get(RISK_SCORE_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.user)).should('exist');
    cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('not.exist');
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
