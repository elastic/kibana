/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BARCHART_POPOVER_BUTTON,
  BARCHART_TIMELINE_BUTTON,
  FLYOUT_CLOSE_BUTTON,
  FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM,
  FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON,
  FLYOUT_TABLE_TAB_ROW_TIMELINE_BUTTON,
  FLYOUT_TABS,
  INDICATOR_FLYOUT_INVESTIGATE_IN_TIMELINE_BUTTON,
  INDICATOR_TYPE_CELL,
  INDICATORS_TABLE_CELL_TIMELINE_BUTTON,
  INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON,
  TIMELINE_DRAGGABLE_ITEM,
  TOGGLE_FLYOUT_BUTTON,
  UNTITLED_TIMELINE_BUTTON,
} from '../screens/indicators';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { login } from '../tasks/login';
import { selectRange } from '../tasks/select_range';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

before(() => {
  login();
});

describe('Indicators', () => {
  before(() => {
    esArchiverLoad('threat_intelligence');
  });
  after(() => {
    esArchiverUnload('threat_intelligence');
  });

  describe('Indicators timeline interactions', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
    });

    it('should add entry in timeline when clicking in the barchart legend', () => {
      cy.get(BARCHART_POPOVER_BUTTON).should('exist').first().click();
      cy.get(BARCHART_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });

    it('should add entry in timeline when clicking in an indicator table cell', () => {
      cy.get(INDICATOR_TYPE_CELL).first().trigger('mouseover');
      cy.get(INDICATORS_TABLE_CELL_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });

    it('should add entry in timeline when clicking in an indicator flyout overview tab table row', () => {
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });

    it('should add entry in timeline when clicking in an indicator flyout overview block', () => {
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM).first().trigger('mouseover');
      cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON)
        .should('exist')
        .first()
        .click({ force: true });
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });

    it('should add entry in timeline when clicking in an indicator flyout table tab', () => {
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FLYOUT_TABS).should('exist');
      cy.get(`${FLYOUT_TABS} button:nth-child(2)`).click();
      cy.get(FLYOUT_TABLE_TAB_ROW_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });

    it('should investigate in timeline when clicking in an indicator table action row', () => {
      cy.get(INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON).should('exist').first().click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });

    it('should investigate in timeline when clicking in an indicator flyout', () => {
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(INDICATOR_FLYOUT_INVESTIGATE_IN_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click();
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
    });
  });
});
