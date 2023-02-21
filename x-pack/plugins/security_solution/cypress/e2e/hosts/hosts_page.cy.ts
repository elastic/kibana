/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';

import { HOSTS_PAGE_TAB_URLS, HOSTS_URL } from '../../urls/navigation';

import { cleanKibana } from '../../tasks/common';

import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { ALL_HOSTS_TABLE, HOSTS_NAMES } from '../../screens/hosts/all_hosts';
import {
  ALL_HOSTS_TAB,
  ANOMALIES_TAB,
  EVENTS_TAB,
  HOST_RISK_TAB,
  SESSIONS_TAB,
  UNCOMMON_PROCESSES_TAB,
  UNIQUE_HOSTS,
  UNIQUE_IPS,
} from '../../screens/hosts/main';
import { ALERTS_OR_EVENTS_HISTOGRAM, EVENTS_VIEWER_PANEL } from '../../screens/hosts/events';
import { UNCOMMON_PROCESSES_TABLE } from '../../screens/hosts/uncommon_processes';
import { ANOMOLIES_PANEL } from '../../screens/hosts/anomalies';
import { SESSIONS_PANEL } from '../../screens/hosts/sessions';
import { HOST_RISK_PANEL } from '../../screens/hosts/host_risk';

describe('Hosts page renders as expected', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('all_users');
    login();
  });

  beforeEach(() => {
    visit(HOSTS_URL);
  });

  it('should render expected components', () => {
    cy.get(UNIQUE_IPS).should('be.visible');
    cy.get(UNIQUE_HOSTS).should('be.visible');
  });

  describe('Routing works correctly', () => {
    it('should handle routing from and back to Hosts page using browser back button', () => {
      cy.get(HOSTS_NAMES).first().click();
      cy.go(-1);
      cy.url().should('include', HOSTS_PAGE_TAB_URLS.allHosts);
    });
  });

  describe('Clicking the Host page tabs works as expected', () => {
    it('should navigate to the correct tabs when clicked', () => {
      // EVENTS
      cy.get(EVENTS_TAB).click();
      cy.get(ALERTS_OR_EVENTS_HISTOGRAM).should('be.visible');
      cy.url().should('contain', HOSTS_PAGE_TAB_URLS.events);
      cy.get(EVENTS_VIEWER_PANEL).should('be.visible');

      // ANOMALIES
      cy.get(ANOMALIES_TAB).click();
      cy.get(ANOMOLIES_PANEL).should('be.visible');
      cy.url().should('contain', HOSTS_PAGE_TAB_URLS.anomalies);

      // ALL HOSTS
      cy.get(ALL_HOSTS_TAB).click();
      cy.get(ALL_HOSTS_TABLE).should('be.visible');
      cy.url().should('contain', HOSTS_PAGE_TAB_URLS.allHosts);

      // UNCOMMON PROCESSES
      cy.get(UNCOMMON_PROCESSES_TAB).click();
      cy.get(UNCOMMON_PROCESSES_TABLE).should('be.visible');
      cy.url().should('contain', HOSTS_PAGE_TAB_URLS.uncommonProcesses);

      // SESSIONS
      cy.get(SESSIONS_TAB).click();
      cy.get(SESSIONS_PANEL).should('be.visible');
      cy.url().should('contain', HOSTS_PAGE_TAB_URLS.sessions);

      // HOST RISK
      cy.get(HOST_RISK_TAB).click();
      cy.get(HOST_RISK_PANEL).should('be.visible');
      cy.url().should('contain', HOSTS_PAGE_TAB_URLS.hostRisk);
    });
  });

  after(() => {
    esArchiverUnload('all_users');
  });
});
