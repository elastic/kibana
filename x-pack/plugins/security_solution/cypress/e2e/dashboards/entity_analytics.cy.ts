/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';

import { ALERTS_URL, ENTITY_ANALYTICS_URL } from '../../urls/navigation';

import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import {
  ANOMALIES_TABLE,
  ANOMALIES_TABLE_ROWS,
  ENABLE_HOST_RISK_SCORE_BUTTON,
  ENABLE_USER_RISK_SCORE_BUTTON,
  HOSTS_DONUT_CHART,
  HOSTS_TABLE_ROWS,
  HOST_RISK_SCORE_NO_DATA_DETECTED,
  UPGRADE_HOST_RISK_SCORE_BUTTON,
  UPGRADE_USER_RISK_SCORE_BUTTON,
  USERS_DONUT_CHART,
  USERS_TABLE,
  USERS_TABLE_ROWS,
  USER_RISK_SCORE_NO_DATA_DETECTED,
  USERS_TABLE_ALERT_CELL,
  HOSTS_TABLE_ALERT_CELL,
  HOSTS_TABLE,
  ANOMALIES_TABLE_NEXT_PAGE_BUTTON,
  ANOMALIES_TABLE_ENABLE_JOB_BUTTON,
  ANOMALIES_TABLE_ENABLE_JOB_LOADER,
  ANOMALIES_TABLE_COUNT_COLUMN,
} from '../../screens/entity_analytics';
import { openRiskTableFilterAndSelectTheLowOption } from '../../tasks/host_risk';
import { createRule } from '../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { getNewRule } from '../../objects/rule';
import { clickOnFirstHostsAlerts, clickOnFirstUsersAlerts } from '../../tasks/risk_scores';
import { OPTION_LIST_LABELS, OPTION_LIST_VALUES } from '../../screens/common/filter_group';
import { setRowsPerPageTo } from '../../tasks/table_pagination';

const TEST_USER_ALERTS = 2;
const TEST_USER_NAME = 'test';
const SIEM_KIBANA_HOST_ALERTS = 2;
const SIEM_KIBANA_HOST_NAME = 'siem-kibana';

describe('Entity Analytics Dashboard', () => {
  before(() => {
    cleanKibana();
    login();
  });

  describe('Without data', () => {
    beforeEach(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    it('shows enable host risk button', () => {
      cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.visible');
    });

    it('shows enable user risk button', () => {
      cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.visible');
    });
  });

  describe('Risk Score enabled but still no data', () => {
    before(() => {
      esArchiverLoad('risk_hosts_no_data');
      esArchiverLoad('risk_users_no_data');
    });

    beforeEach(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    after(() => {
      esArchiverUnload('risk_hosts_no_data');
      esArchiverUnload('risk_users_no_data');
    });

    it('shows no data detected prompt for host risk score module', () => {
      cy.get(HOST_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
    });

    it('shows no data detected prompt for user risk score module', () => {
      cy.get(USER_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
    });
  });

  describe('With Legacy data', () => {
    before(() => {
      esArchiverLoad('risk_hosts_legacy_data');
      esArchiverLoad('risk_users_legacy_data');
    });

    beforeEach(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    after(() => {
      esArchiverUnload('risk_hosts_legacy_data');
      esArchiverUnload('risk_users_legacy_data');
    });

    it('shows upgrade host risk button', () => {
      cy.get(UPGRADE_HOST_RISK_SCORE_BUTTON).should('be.visible');
    });

    it('shows upgrade user risk button', () => {
      cy.get(UPGRADE_USER_RISK_SCORE_BUTTON).should('be.visible');
    });
  });

  describe('With host risk data', () => {
    before(() => {
      esArchiverLoad('risk_hosts');
    });

    beforeEach(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    after(() => {
      esArchiverUnload('risk_hosts');
    });

    it('renders donut chart', () => {
      cy.get(HOSTS_DONUT_CHART).should('include.text', '6Total');
    });

    it('renders table', () => {
      cy.get(HOSTS_TABLE).should('be.visible');
      cy.get(HOSTS_TABLE_ROWS).should('have.length', 5);
    });

    it('renders alerts column', () => {
      cy.get(HOSTS_TABLE_ALERT_CELL).should('have.length', 5);
    });

    it('filters by risk classification', () => {
      openRiskTableFilterAndSelectTheLowOption();

      cy.get(HOSTS_DONUT_CHART).should('include.text', '1Total');
      cy.get(HOSTS_TABLE_ROWS).should('have.length', 1);
    });

    describe('With alerts data', () => {
      before(() => {
        createRule(getNewRule());
      });

      beforeEach(() => {
        visit(ALERTS_URL);
        waitForAlertsToPopulate();
        visit(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        deleteAlertsAndRules();
      });

      it('populates alerts column', () => {
        cy.get(HOSTS_TABLE_ALERT_CELL).first().should('include.text', SIEM_KIBANA_HOST_ALERTS);
      });

      it('opens alerts page when alerts count is clicked', () => {
        clickOnFirstHostsAlerts();
        cy.url().should('include', ALERTS_URL);

        cy.get(OPTION_LIST_LABELS).eq(0).should('include.text', 'Status');
        cy.get(OPTION_LIST_VALUES(0)).should('include.text', 'open');
        cy.get(OPTION_LIST_LABELS).eq(1).should('include.text', 'Host');
        cy.get(OPTION_LIST_VALUES(1)).should('include.text', SIEM_KIBANA_HOST_NAME);
      });
    });
  });

  describe('With user risk data', () => {
    before(() => {
      esArchiverLoad('risk_users');
    });

    beforeEach(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    after(() => {
      esArchiverUnload('risk_users');
    });

    it('renders donut chart', () => {
      cy.get(USERS_DONUT_CHART).should('include.text', '7Total');
    });

    it('renders table', () => {
      cy.get(USERS_TABLE).should('be.visible');
      cy.get(USERS_TABLE_ROWS).should('have.length', 5);
    });

    it('renders alerts column', () => {
      cy.get(USERS_TABLE_ALERT_CELL).should('have.length', 5);
    });

    it('filters by risk classification', () => {
      openRiskTableFilterAndSelectTheLowOption();

      cy.get(USERS_DONUT_CHART).should('include.text', '2Total');
      cy.get(USERS_TABLE_ROWS).should('have.length', 2);
    });

    describe('With alerts data', () => {
      before(() => {
        createRule(getNewRule());
      });

      beforeEach(() => {
        visit(ALERTS_URL);
        waitForAlertsToPopulate();
        visit(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        deleteAlertsAndRules();
      });

      it('populates alerts column', () => {
        cy.get(USERS_TABLE_ALERT_CELL).first().should('include.text', TEST_USER_ALERTS);
      });

      it('opens alerts page when alerts count is clicked', () => {
        clickOnFirstUsersAlerts();

        cy.url().should('include', ALERTS_URL);

        cy.get(OPTION_LIST_LABELS).eq(0).should('include.text', 'Status');
        cy.get(OPTION_LIST_VALUES(0)).should('include.text', 'open');
        cy.get(OPTION_LIST_LABELS).eq(1).should('include.text', 'User');
        cy.get(OPTION_LIST_VALUES(1)).should('include.text', TEST_USER_NAME);
      });
    });
  });

  describe('With anomalies data', () => {
    before(() => {
      esArchiverLoad('network');
    });

    after(() => {
      esArchiverUnload('network');
    });

    beforeEach(() => {
      visit(ENTITY_ANALYTICS_URL);
    });

    it('renders table with pagination', () => {
      cy.get(ANOMALIES_TABLE).should('be.visible');
      cy.get(ANOMALIES_TABLE_ROWS).should('have.length', 10);

      // navigates to next page
      cy.get(ANOMALIES_TABLE_NEXT_PAGE_BUTTON).click();
      cy.get(ANOMALIES_TABLE_ROWS).should('have.length', 10);

      // updates rows per page to 25 items
      setRowsPerPageTo(25);
      cy.get(ANOMALIES_TABLE_ROWS).should('have.length', 25);
    });

    it('enables a job', () => {
      cy.get(ANOMALIES_TABLE_ROWS)
        .eq(5)
        .within(() => {
          cy.get(ANOMALIES_TABLE_ENABLE_JOB_BUTTON).click();
          cy.get(ANOMALIES_TABLE_ENABLE_JOB_LOADER).should('be.visible');
          cy.get(ANOMALIES_TABLE_COUNT_COLUMN).should('include.text', '0');
        });
    });
  });
});
