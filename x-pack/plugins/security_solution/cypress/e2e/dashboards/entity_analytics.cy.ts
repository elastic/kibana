/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';

import { ENTITY_ANALYTICS_URL } from '../../urls/navigation';

import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { cleanKibana } from '../../tasks/common';
import {
  ANOMALIES_TABLE,
  ANOMALIES_TABLE_ROWS,
  ENABLE_HOST_RISK_SCORE_BUTTON,
  ENABLE_USER_RISK_SCORE_BUTTON,
  HOSTS_DONUT_CHART,
  HOSTS_TABLE,
  HOSTS_TABLE_ROWS,
  USERS_DONUT_CHART,
  USERS_TABLE,
  USERS_TABLE_ROWS,
} from '../../screens/entity_analytics';
import { openRiskTableFilterAndSelectTheLowOption } from '../../tasks/host_risk';

describe('Entity Analytics Dashboard', () => {
  before(() => {
    cleanKibana();
    login();
  });

  describe('Without data', () => {
    before(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    it('shows enable host risk button', () => {
      cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.visible');
    });

    it('shows enable user risk button', () => {
      cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.visible');
    });
  });

  describe('With host risk data', () => {
    before(() => {
      esArchiverLoad('risky_hosts');
      visit(ENTITY_ANALYTICS_URL);
    });

    after(() => {
      esArchiverUnload('risky_hosts');
    });

    it('renders donut chart', () => {
      cy.get(HOSTS_DONUT_CHART).should('include.text', '6Total');
    });

    it('renders table', () => {
      cy.get(HOSTS_TABLE).should('be.visible');
      cy.get(HOSTS_TABLE_ROWS).should('have.length', 5);
    });

    it('filters by risk classification', () => {
      openRiskTableFilterAndSelectTheLowOption();

      cy.get(HOSTS_DONUT_CHART).should('include.text', '1Total');
      cy.get(HOSTS_TABLE_ROWS).should('have.length', 1);
    });
  });

  describe('With user risk data', () => {
    before(() => {
      esArchiverLoad('risky_users');
      visit(ENTITY_ANALYTICS_URL);
    });

    after(() => {
      esArchiverUnload('risky_users');
    });

    it('renders donut chart', () => {
      cy.get(USERS_DONUT_CHART).should('include.text', '6Total');
    });

    it('renders table', () => {
      cy.get(USERS_TABLE).should('be.visible');
      cy.get(USERS_TABLE_ROWS).should('have.length', 5);
    });

    it('filters by risk classification', () => {
      openRiskTableFilterAndSelectTheLowOption();

      cy.get(USERS_DONUT_CHART).should('include.text', '1Total');
      cy.get(USERS_TABLE_ROWS).should('have.length', 1);
    });
  });

  describe('With anomalies data', () => {
    before(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    it('renders table', () => {
      cy.get(ANOMALIES_TABLE).should('be.visible');
      cy.get(ANOMALIES_TABLE_ROWS).should('have.length', 6);
    });
  });
});
