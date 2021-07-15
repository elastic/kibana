/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OVERVIEW_CTI_ENABLE_MODULE_BUTTON,
  OVERVIEW_CTI_LINKS,
  OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL,
  OVERVIEW_CTI_LINKS_INFO_INNER_PANEL,
  OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL,
  OVERVIEW_CTI_TOTAL_EVENT_COUNT,
  OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON,
} from '../../screens/overview';

import { loginAndWaitForPage } from '../../tasks/login';
import { OVERVIEW_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

describe('CTI Link Panel', () => {
  before(() => {
    cleanKibana();
  });

  it('renders disabled threat intel module as expected', () => {
    loginAndWaitForPage(OVERVIEW_URL);
    cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL}`).should('exist');
    cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
    cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 indicators');
    cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`).should('exist');
    cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`).should(
      'have.attr',
      'href',
      'https://www.elastic.co/guide/en/beats/filebeat/master/filebeat-module-threatintel.html'
    );
  });

  describe('enabled threat intel module', () => {
    before(() => {
      esArchiverLoad('threat_indicator');
    });

    after(() => {
      esArchiverUnload('threat_indicator');
    });

    it('renders disabled dashboard module as expected when there are no events in the selected time period', () => {
      loginAndWaitForPage(
        `${OVERVIEW_URL}?sourcerer=(timerange:(from:%272021-07-08T04:00:00.000Z%27,kind:absolute,to:%272021-07-09T03:59:59.999Z%27))`
      );
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should('exist');
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should('exist');
      cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
      cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 indicators');
    });

    it('renders dashboard module as expected when there are events in the selected time period', () => {
      loginAndWaitForPage(OVERVIEW_URL);
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should('not.exist');
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should('exist');
      cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
      cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 1 indicator');
    });
  });
});
