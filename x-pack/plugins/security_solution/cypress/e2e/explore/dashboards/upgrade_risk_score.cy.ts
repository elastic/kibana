/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { getNewRule } from '../../../objects/rule';
import {
  RISK_SCORE_INSTALLATION_SUCCESS_TOAST,
  UPGRADE_HOST_RISK_SCORE_BUTTON,
  UPGRADE_USER_RISK_SCORE_BUTTON,
  UPGRADE_CANCELLATION_BUTTON,
  UPGRADE_CONFIRMATION_MODAL,
  RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST,
} from '../../../screens/entity_analytics';
import {
  deleteRiskScore,
  installLegacyRiskScoreModule,
} from '../../../tasks/api_calls/risk_scores';
import { findSavedObjects } from '../../../tasks/api_calls/risk_scores/saved_objects';
import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import {
  clickUpgradeRiskScore,
  clickUpgradeRiskScoreConfirmed,
  interceptUpgradeRiskScoreModule,
  waitForUpgradeRiskScoreModule,
} from '../../../tasks/risk_scores';
import { RiskScoreEntity } from '../../../tasks/risk_scores/common';
import {
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  getTransformState,
} from '../../../tasks/risk_scores/transforms';
import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';

const spaceId = 'default';

describe('Upgrade risk scores', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    login();
    createRule(getNewRule({ rule_id: 'rule1' }));
  });

  beforeEach(() => {
    login();
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
    installLegacyRiskScoreModule(RiskScoreEntity.host, spaceId);
    installLegacyRiskScoreModule(RiskScoreEntity.user, spaceId);
    visit(ENTITY_ANALYTICS_URL);
  });

  it('shows upgrade risk button for host and user', () => {
    cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('be.visible');
    cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('be.visible');
  });

  it('should show a confirmation modal for upgrading host risk score and display a link to host risk score Elastic doc', () => {
    clickUpgradeRiskScore(RiskScoreEntity.host);
    cy.get(UPGRADE_CONFIRMATION_MODAL(RiskScoreEntity.host)).should('exist');

    cy.get(UPGRADE_CANCELLATION_BUTTON)
      .get(`${UPGRADE_CONFIRMATION_MODAL(RiskScoreEntity.host)} a`)
      .then((link) => {
        expect(link.prop('href')).to.eql(
          `https://www.elastic.co/guide/en/security/current/${RiskScoreEntity.host}-risk-score.html`
        );
      });
  });

  it('should show a confirmation modal for upgrading user risk score and display a link to user risk score Elastic doc', () => {
    clickUpgradeRiskScore(RiskScoreEntity.user);
    cy.get(UPGRADE_CONFIRMATION_MODAL(RiskScoreEntity.user)).should('exist');

    cy.get(UPGRADE_CANCELLATION_BUTTON)
      .get(`${UPGRADE_CONFIRMATION_MODAL(RiskScoreEntity.user)} a`)
      .then((link) => {
        expect(link.prop('href')).to.eql(
          `https://www.elastic.co/guide/en/security/current/${RiskScoreEntity.user}-risk-score.html`
        );
      });
  });
});

const versions: Array<'8.3' | '8.4'> = ['8.3', '8.4'];
versions.forEach((version) =>
  describe(`handles version ${version} upgrades`, () => {
    before(() => {
      cleanKibana();
    });

    beforeEach(() => {
      login();
      createRule(getNewRule({ rule_id: 'rule1' }));
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
      installLegacyRiskScoreModule(RiskScoreEntity.host, spaceId, version);
      installLegacyRiskScoreModule(RiskScoreEntity.user, spaceId, version);
      visit(ENTITY_ANALYTICS_URL);
    });

    afterEach(() => {
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
    });

    it('should upgrade host risk score successfully', () => {
      clickUpgradeRiskScore(RiskScoreEntity.host);

      interceptUpgradeRiskScoreModule(RiskScoreEntity.host, version);

      clickUpgradeRiskScoreConfirmed();
      waitForUpgradeRiskScoreModule();

      cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('be.disabled');

      cy.get(RISK_SCORE_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.host)).should('exist');
      cy.get(RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.host)).should(
        'exist'
      );

      cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('not.exist');
      getTransformState(getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId)).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.transforms[0].id).to.eq(
          getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId)
        );
        expect(res.body.transforms[0].state).to.eq('started');
      });
      getTransformState(getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId)).then(
        (res) => {
          expect(res.status).to.eq(200);
          expect(res.body.transforms[0].id).to.eq(
            getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId)
          );
          expect(res.body.transforms[0].state).to.eq('started');
        }
      );
      findSavedObjects(RiskScoreEntity.host, spaceId).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.saved_objects.length).to.eq(11);
      });
    });

    it('should upgrade user risk score successfully', () => {
      clickUpgradeRiskScore(RiskScoreEntity.user);
      interceptUpgradeRiskScoreModule(RiskScoreEntity.user);
      clickUpgradeRiskScoreConfirmed();
      waitForUpgradeRiskScoreModule();
      cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('be.disabled');

      cy.get(RISK_SCORE_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.user)).should('exist');
      cy.get(RISK_SCORE_DASHBOARDS_INSTALLATION_SUCCESS_TOAST(RiskScoreEntity.user)).should(
        'exist'
      );

      cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('not.exist');
      getTransformState(getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId)).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.transforms[0].id).to.eq(
          getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId)
        );
        expect(res.body.transforms[0].state).to.eq('started');
      });
      getTransformState(getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId)).then(
        (res) => {
          expect(res.status).to.eq(200);
          expect(res.body.transforms[0].id).to.eq(
            getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId)
          );
          expect(res.body.transforms[0].state).to.eq('started');
        }
      );

      findSavedObjects(RiskScoreEntity.user, spaceId).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.saved_objects.length).to.eq(11);
      });
    });
  })
);
