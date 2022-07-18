/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OVERVIEW_RISKY_HOSTS_ENABLE_MODULE_BUTTON,
  OVERVIEW_RISKY_HOSTS_LINKS,
  OVERVIEW_RISKY_HOSTS_LINKS_ERROR_INNER_PANEL,
  OVERVIEW_RISKY_HOSTS_LINKS_WARNING_INNER_PANEL,
  OVERVIEW_RISKY_HOSTS_TOTAL_EVENT_COUNT,
  OVERVIEW_RISKY_HOSTS_VIEW_DASHBOARD_BUTTON,
} from '../../screens/overview';

import { login, visit } from '../../tasks/login';
import { OVERVIEW_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';
import { changeSpace } from '../../tasks/kibana_navigation';
import { createSpace, removeSpace } from '../../tasks/api_calls/spaces';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

const testSpaceName = 'test';

describe('Risky Hosts Link Panel', () => {
  before(() => {
    cleanKibana();
    login();
  });

  it('renders disabled panel view as expected', () => {
    visit(OVERVIEW_URL);
    cy.get(`${OVERVIEW_RISKY_HOSTS_LINKS} ${OVERVIEW_RISKY_HOSTS_LINKS_ERROR_INNER_PANEL}`).should(
      'exist'
    );
    cy.get(`${OVERVIEW_RISKY_HOSTS_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
    cy.get(`${OVERVIEW_RISKY_HOSTS_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 hosts');
    cy.get(`${OVERVIEW_RISKY_HOSTS_ENABLE_MODULE_BUTTON}`).should('exist');
    cy.get(`${OVERVIEW_RISKY_HOSTS_ENABLE_MODULE_BUTTON}`)
      .should('have.attr', 'href')
      .and('match', /host-risk-score.md/);
  });

  describe('enabled module', () => {
    before(() => {
      esArchiverLoad('risky_hosts');
      createSpace(testSpaceName);
    });

    after(() => {
      esArchiverUnload('risky_hosts');
      removeSpace(testSpaceName);
    });

    it('renders disabled dashboard module as expected when there are no hosts in the selected time period', () => {
      visit(
        `${OVERVIEW_URL}?sourcerer=(timerange:(from:%272021-07-08T04:00:00.000Z%27,kind:absolute,to:%272021-07-09T03:59:59.999Z%27))`
      );
      cy.get(
        `${OVERVIEW_RISKY_HOSTS_LINKS} ${OVERVIEW_RISKY_HOSTS_LINKS_WARNING_INNER_PANEL}`
      ).should('exist');
      cy.get(`${OVERVIEW_RISKY_HOSTS_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
      cy.get(`${OVERVIEW_RISKY_HOSTS_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 hosts');
    });

    it('renders space aware dashboard module as expected when there are hosts in the selected time period', () => {
      visit(OVERVIEW_URL);
      cy.get(
        `${OVERVIEW_RISKY_HOSTS_LINKS} ${OVERVIEW_RISKY_HOSTS_LINKS_WARNING_INNER_PANEL}`
      ).should('not.exist');
      cy.get(`${OVERVIEW_RISKY_HOSTS_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
      cy.get(`${OVERVIEW_RISKY_HOSTS_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 6 hosts');

      changeSpace(testSpaceName);
      cy.visit(`/s/${testSpaceName}${OVERVIEW_URL}`);
      cy.get(`${OVERVIEW_RISKY_HOSTS_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
      cy.get(`${OVERVIEW_RISKY_HOSTS_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 hosts');
      cy.get(`${OVERVIEW_RISKY_HOSTS_ENABLE_MODULE_BUTTON}`).should('exist');
    });
  });
});
