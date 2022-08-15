/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_LAYOUT_TITLE,
  FLYOUT_JSON,
  FLYOUT_TABLE,
  FLYOUT_TABS,
  FLYOUT_TITLE,
  INDICATORS_TABLE,
  TOGGLE_FLYOUT_BUTTON,
  FILTERS_GLOBAL_CONTAINER,
  TIME_RANGE_PICKER,
  QUERY_INPUT,
  TABLE_CONTROLS,
  INDICATOR_TYPE_CELL,
  EMPTY_STATE,
  FIELD_SELECTOR,
  BREADCRUMBS,
  LEADING_BREADCRUMB,
  ENDING_BREADCRUMB,
} from '../../screens/indicators';
import { login } from '../../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

before(() => {
  login();
});

/**
 * Time range extended to 15 years back to ensure fixtures are showing up correctly
 * TODO: https://github.com/elastic/security-team/issues/4595
 */
const THREAT_INTELLIGENCE_15Y_DATA =
  '/app/security/threat_intelligence/indicators?indicators=(filterQuery:(language:kuery,query:%27%27),filters:!(),timeRange:(from:now-15y/d,to:now))';

const URL_WITH_CONTRADICTORY_FILTERS =
  '/app/security/threat_intelligence/indicators?indicators=(filterQuery:(language:kuery,query:%27%27),filters:!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:threat.indicator.type,negate:!f,params:(query:file),type:phrase),query:(match_phrase:(threat.indicator.type:file))),(%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:threat.indicator.type,negate:!f,params:(query:url),type:phrase),query:(match_phrase:(threat.indicator.type:url)))),timeRange:(from:now/d,to:now/d))';

describe('Indicators', () => {
  before(() => {
    esArchiverLoad('threat_intelligence');
  });
  after(() => {
    esArchiverUnload('threat_intelligence');
  });

  describe('Indicators page basics', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE_15Y_DATA);
    });

    it('should render the basic page elements', () => {
      cy.get(BREADCRUMBS).should('exist');

      cy.get(LEADING_BREADCRUMB).should('have.text', 'Security');

      cy.get(ENDING_BREADCRUMB).should('have.text', 'Intelligence');

      cy.get(DEFAULT_LAYOUT_TITLE).should('have.text', 'Indicators');

      cy.get(INDICATORS_TABLE).should('exist');

      cy.get(FILTERS_GLOBAL_CONTAINER).should('exist');

      cy.get(`${FILTERS_GLOBAL_CONTAINER} ${TIME_RANGE_PICKER}`).should('exist');

      cy.get(`${FIELD_SELECTOR}`).should('exist');
    });

    it('should show the indicator flyout on ioc click', () => {
      // Just to know that the data is loaded. This will be replaced with some better mechanism.
      cy.get(TABLE_CONTROLS).should('contain.text', 'Showing 1-25 of');

      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });

      cy.get(FLYOUT_TITLE).should('contain', 'Indicator:');

      cy.get(FLYOUT_TABLE).should('exist').and('contain.text', 'threat.indicator.type');

      cy.get(FLYOUT_TABS).should('exist').children().should('have.length', 2).last().click();

      cy.get(FLYOUT_JSON).should('exist').and('contain.text', 'threat.indicator.type');
    });
  });

  describe('Indicator page search', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE_15Y_DATA);
    });

    it('should narrow the results to url indicators when respective KQL search is executed', () => {
      cy.get(QUERY_INPUT).should('exist').focus().type('threat.indicator.type: "url"{enter}');

      // Check if query results are narrowed after search
      cy.get(INDICATOR_TYPE_CELL).should('not.contain.text', 'file');

      cy.get(QUERY_INPUT)
        .should('exist')
        .focus()
        .clear()
        .type('threat.indicator.type: "file"{enter}');

      cy.get(INDICATOR_TYPE_CELL).should('not.contain.text', 'url');
    });

    it('should go to the 2nd page', () => {
      cy.get('[data-test-subj="pagination-button-1"]').click();

      cy.get(TABLE_CONTROLS).should('contain.text', 'Showing 26-50 of');
    });

    it('should go to page 1 when search input is cleared', () => {
      cy.get(QUERY_INPUT).should('exist').focus().clear().type('{enter}');

      cy.get(TABLE_CONTROLS).should('contain.text', 'Showing 1-25 of');
    });

    describe('No items match search criteria', () => {
      before(() =>
        // Contradictory filter set
        cy.visit(URL_WITH_CONTRADICTORY_FILTERS)
      );

      it('should not display the table when contractictory filters are set', () => {
        cy.get(FLYOUT_TABLE).should('not.exist');

        cy.get(EMPTY_STATE).should('exist').and('contain.text', 'No results');
      });
    });

    it('should have the default selected field, then update when user selects', () => {
      const threatFeedName = 'threat.feed.name';
      cy.get(`${FIELD_SELECTOR}`).should('have.value', threatFeedName);

      const threatIndicatorIp: string = 'threat.indicator.ip';

      cy.get(`${FIELD_SELECTOR}`)
        .should('exist')
        .select(threatIndicatorIp)
        .should('have.value', threatIndicatorIp);

      cy.get(`${FIELD_SELECTOR}`).should('have.value', threatIndicatorIp);
    });
  });
});
