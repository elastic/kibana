/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENABLE_HOST_RISK_SCORE_BUTTON,
  ENABLE_USER_RISK_SCORE_BUTTON,
  HOSTS_TABLE_ALERT_CELL,
  UPGRADE_CONFIRMATION_BUTTON,
  UPGRADE_HOST_RISK_SCORE_BUTTON,
  UPGRADE_USER_RISK_SCORE_BUTTON,
  USERS_TABLE_ALERT_CELL,
} from '../../screens/entity_analytics';
import {
  INGEST_PIPELINES_URL,
  RISK_SCORE_SAVED_OBJECTS_URL,
  STORED_SCRIPTS_URL,
  TRANSFORMS_URL,
} from '../../urls/risk_score';
import { intercepInstallRiskScoreModule } from '../api_calls/risk_scores';

import { RiskScoreEntity } from './common';
import { getIngestPipelineName, getLegacyIngestPipelineName } from './ingest_pipelines';

export const interceptUpgradeRiskScoreModule = (
  riskScoreEntity: RiskScoreEntity,
  version?: '8.3' | '8.4'
) => {
  const ingestPipelinesNames = `${getLegacyIngestPipelineName(
    riskScoreEntity
  )},${getIngestPipelineName(riskScoreEntity)}`;
  cy.intercept(
    `POST`,
    `${RISK_SCORE_SAVED_OBJECTS_URL}/_bulk_delete/${riskScoreEntity}RiskScoreDashboards`
  ).as('deleteDashboards');
  cy.intercept(`POST`, `${TRANSFORMS_URL}/stop_transforms`).as('stopTransforms');
  cy.intercept(`POST`, `${TRANSFORMS_URL}/delete_transforms`).as('deleteTransforms');
  cy.intercept(`DELETE`, `${INGEST_PIPELINES_URL}/${ingestPipelinesNames}`).as(
    'deleteIngestPipelines'
  );
  cy.intercept(`DELETE`, `${STORED_SCRIPTS_URL}/delete`).as('deleteScripts');
  intercepInstallRiskScoreModule();
};

export const waitForUpgradeRiskScoreModule = () => {
  cy.wait(
    [
      '@deleteDashboards',
      '@stopTransforms',
      '@deleteTransforms',
      '@deleteIngestPipelines',
      '@deleteScripts',
      '@install',
    ],
    { requestTimeout: 50000 }
  );
};

export const clickEnableRiskScore = (riskScoreEntity: RiskScoreEntity) => {
  const button =
    riskScoreEntity === RiskScoreEntity.user
      ? ENABLE_USER_RISK_SCORE_BUTTON
      : ENABLE_HOST_RISK_SCORE_BUTTON;

  cy.get(button).click();
};

export const clickUpgradeRiskScore = (riskScoreEntity: RiskScoreEntity) => {
  const button =
    riskScoreEntity === RiskScoreEntity.user
      ? UPGRADE_USER_RISK_SCORE_BUTTON
      : UPGRADE_HOST_RISK_SCORE_BUTTON;

  cy.get(button).click();
};

export const clickUpgradeRiskScoreConfirmed = () => {
  cy.get(UPGRADE_CONFIRMATION_BUTTON).click();
};

export const clickOnFirstUsersAlerts = () => {
  cy.get(USERS_TABLE_ALERT_CELL).first().click();
};

export const clickOnFirstHostsAlerts = () => {
  cy.get(HOSTS_TABLE_ALERT_CELL).first().click();
};
