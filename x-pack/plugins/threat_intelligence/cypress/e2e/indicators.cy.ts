/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BREADCRUMBS,
  DEFAULT_LAYOUT_TITLE,
  EMPTY_STATE,
  ENDING_BREADCRUMB,
  FIELD_BROWSER,
  FIELD_BROWSER_MODAL,
  FIELD_SELECTOR,
  FIELD_SELECTOR_INPUT,
  FIELD_SELECTOR_LIST,
  FIELD_SELECTOR_TOGGLE_BUTTON,
  FILTERS_GLOBAL_CONTAINER,
  FLYOUT_JSON,
  FLYOUT_TABLE,
  FLYOUT_TABS,
  FLYOUT_TITLE,
  INDICATOR_TYPE_CELL,
  INDICATORS_TABLE,
  INDICATORS_TABLE_INDICATOR_NAME_CELL,
  INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON,
  INDICATORS_TABLE_ROW_CELL,
  INSPECTOR_BUTTON,
  INSPECTOR_PANEL,
  LEADING_BREADCRUMB,
  QUERY_INPUT,
  TABLE_CONTROLS,
  TIME_RANGE_PICKER,
  TOGGLE_FLYOUT_BUTTON,
} from '../screens/indicators';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { selectRange } from '../tasks/select_range';

before(() => {
  login();
});

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

const URL_WITH_CONTRADICTORY_FILTERS =
  '/app/security/threat_intelligence/indicators?indicators=(filterQuery:(language:kuery,query:%27%27),filters:!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:threat.indicator.type,negate:!f,params:(query:file),type:phrase),query:(match_phrase:(threat.indicator.type:file))),(%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,index:%27%27,key:threat.indicator.type,negate:!f,params:(query:url),type:phrase),query:(match_phrase:(threat.indicator.type:url)))),timeRange:(from:now/d,to:now/d))';

describe('Invalid Indicators', () => {
  describe('verify the grid loads even with missing fields', () => {
    before(() => {
      esArchiverLoad('threat_intelligence/invalid_indicators_data');

      cy.visit(THREAT_INTELLIGENCE);
      selectRange();
    });
    after(() => {
      esArchiverUnload('threat_intelligence/invalid_indicators_data');
    });

    it('should display data grid despite the missing fields', () => {
      cy.get(INDICATORS_TABLE).should('exist');

      // there are 19 documents in the x-pack/test/threat_intelligence_cypress/es_archives/threat_intelligence/invalid_indicators_data/data.json
      const documentsNumber = 19;
      cy.get(INDICATORS_TABLE_ROW_CELL).should('have.length.gte', documentsNumber);

      // the last document has no hash so the investigate in timeline button isn't rendered
      cy.get(INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON).should(
        'have.length',
        documentsNumber - 1
      );

      // we should have 19 documents plus the header
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).should('have.length', documentsNumber + 1);

      // the last entry has no hash to we show - in the Indicator Name column
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).last().should('contain.text', '-');
    });
  });

  describe('verify the grid loads even with missing mappings and missing fields', () => {
    before(() => {
      esArchiverLoad('threat_intelligence/missing_mappings_indicators_data');

      cy.visit(THREAT_INTELLIGENCE);
      selectRange();
    });
    after(() => {
      esArchiverUnload('threat_intelligence/missing_mappings_indicators_data');
    });

    it('should display data grid despite the missing mappings and missing fields', () => {
      cy.get(INDICATORS_TABLE).should('exist');

      // there are 19 documents in the x-pack/test/threat_intelligence_cypress/es_archives/threat_intelligence/invalid_indicators_data/data.json
      const documentsNumber = 19;
      cy.get(INDICATORS_TABLE_ROW_CELL).should('have.length.gte', documentsNumber);

      // the last document has no hash so the investigate in timeline button isn't rendered
      cy.get(INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON).should(
        'have.length',
        documentsNumber - 1
      );

      // we should have 19 documents plus the header
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).should('have.length', documentsNumber + 1);

      // the last entry has no hash to we show - in the Indicator Name column
      cy.get(INDICATORS_TABLE_INDICATOR_NAME_CELL).last().should('contain.text', '-');
    });
  });
});

describe('Indicators', () => {
  before(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
  });
  after(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  describe('Indicators page loading', () => {
    it('verify the fleet plugin integrations endpoint exists', () => {
      cy.request({
        method: 'GET',
        url: '/api/fleet/epm/packages',
      }).should((response) => expect(response.status).to.eq(200));
    });
  });

  describe('Indicators page basics', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
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

      cy.get(FLYOUT_TITLE).should('contain', 'Indicator details');

      cy.get(FLYOUT_TABS).should('exist').children().should('have.length', 3);

      cy.get(FLYOUT_TABS).should('exist');
      cy.get(`${FLYOUT_TABS} button:nth-child(2)`).click();

      cy.get(FLYOUT_TABLE).should('exist').and('contain.text', 'threat.indicator.type');

      cy.get(`${FLYOUT_TABS} button:nth-child(3)`).click();
      cy.get(FLYOUT_JSON).should('exist').and('contain.text', 'threat.indicator.type');
    });
  });

  describe('Indicator page search', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
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
      before(() => {
        // Contradictory filter set
        cy.visit(URL_WITH_CONTRADICTORY_FILTERS);

        selectRange();
      });

      it('should not display the table when contractictory filters are set', () => {
        cy.get(FLYOUT_TABLE).should('not.exist');

        cy.get(EMPTY_STATE).should('exist').and('contain.text', 'No results');
      });
    });

    it('should have the default selected field, then update when user selects', () => {
      const threatFeedName = 'threat.feed.name';
      cy.get(`${FIELD_SELECTOR_INPUT}`).eq(0).should('have.text', threatFeedName);

      const timestamp: string = '@timestamp';

      cy.get(`${FIELD_SELECTOR_TOGGLE_BUTTON}`).should('exist').click();

      cy.get(`${FIELD_SELECTOR_LIST}`).should('exist').contains(timestamp);
    });
  });

  describe('Field browser', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
    });

    describe('when field browser is triggered', () => {
      it('should render proper modal window', () => {
        cy.get(FIELD_BROWSER).last().click({ force: true });

        cy.get(FIELD_BROWSER_MODAL).should('be.visible');
      });
    });
  });

  describe('Request inspector', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
    });

    describe('when inspector button is clicked', () => {
      it('should render the inspector flyout', () => {
        cy.get(INSPECTOR_BUTTON).last().click({ force: true });

        cy.get(INSPECTOR_PANEL).contains('Indicators search requests');
      });
    });
  });
});
