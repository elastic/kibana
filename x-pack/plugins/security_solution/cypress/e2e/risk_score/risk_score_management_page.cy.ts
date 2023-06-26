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
  OVERVIEW_CTI_TOTAL_EVENT_COUNT,
} from '../../screens/overview';

import { login, visit } from '../../tasks/login';
import { OVERVIEW_URL } from '../../urls/navigation';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

describe('CTI Link Panel', () => {
  beforeEach(() => {
    login();
  });

  it('renders disabled threat intel module as expected', () => {
    visit(OVERVIEW_URL);
    cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL}`).should('exist');
    cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 indicators');
    cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`).should('exist');
    cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`)
      .should('have.attr', 'href')
      .and('match', /app\/integrations\/browse\/threat_intel/);
  });

  describe('Risk score management page', () => {
    before(() => {});

    beforeEach(() => {
      login();
    });

    after(() => {});

    describe('Risk preview', () => {});
  });
});
