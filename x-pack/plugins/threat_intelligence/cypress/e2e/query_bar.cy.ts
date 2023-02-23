/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BARCHART_FILTER_IN_BUTTON,
  BARCHART_FILTER_OUT_BUTTON,
  BARCHART_POPOVER_BUTTON,
  FLYOUT_CLOSE_BUTTON,
  FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON,
  FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON,
  FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON,
  FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON,
  FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON,
  FLYOUT_TABS,
  INDICATOR_TYPE_CELL,
  INDICATORS_TABLE_CELL_FILTER_IN_BUTTON,
  INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON,
  KQL_FILTER,
  TOGGLE_FLYOUT_BUTTON,
} from '../screens/indicators';
import { selectRange } from '../tasks/select_range';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Indicators', () => {
  before(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
  });
  after(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  describe('Indicators query bar interaction', () => {
    beforeEach(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
    });

    it('should add filter to kql and filter in values when clicking in the barchart legend', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(BARCHART_POPOVER_BUTTON).should('exist').first().click();
      cy.get(BARCHART_FILTER_IN_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add negated filter to kql and filter out values when clicking in the barchart legend', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(BARCHART_POPOVER_BUTTON).should('exist').first().click();
      cy.get(BARCHART_FILTER_OUT_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add filter to kql and filter in and out values when clicking in an indicators table cell', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

      cy.get(INDICATOR_TYPE_CELL)
        .first()
        .should('be.visible')
        .trigger('mouseover')
        .within((_cell) => {
          cy.get(INDICATORS_TABLE_CELL_FILTER_IN_BUTTON).should('exist').click({
            force: true,
          });
        });

      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add negated filter and filter out and out values when clicking in an indicators table cell', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(INDICATOR_TYPE_CELL)
        .first()
        .trigger('mouseover')
        .within((_cell) => {
          cy.get(INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON).should('exist').click({ force: true });
        });

      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add filter to kql and filter in values when clicking in an indicators flyout overview tab block', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM).first().trigger('mouseover');
      cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON)
        .should('exist')
        .first()
        .click({ force: true });
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add negated filter to kql filter out values when clicking in an indicators flyout overview block', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM).first().trigger('mouseover');
      cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON)
        .should('exist')
        .first()
        .click({ force: true });
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add filter to kql and filter in values when clicking in an indicators flyout overview tab table row', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add negated filter to kql filter out values when clicking in an indicators flyout overview tab row', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add filter to kql and filter in values when clicking in an indicators flyout table tab action column', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(`${FLYOUT_TABS} button:nth-child(2)`).click();
      cy.get(FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });

    it('should add negated filter to kql filter out values when clicking in an indicators flyout table tab action column', () => {
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(`${FLYOUT_TABS} button:nth-child(2)`).click();
      cy.get(FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
      cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);
    });
  });
});
