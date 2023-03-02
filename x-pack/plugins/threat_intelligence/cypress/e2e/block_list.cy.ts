/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BLOCK_LIST_ADD_BUTTON,
  BLOCK_LIST_DESCRIPTION,
  BLOCK_LIST_FLYOUT_CLOSE_BUTTON,
  BLOCK_LIST_NAME,
  BLOCK_LIST_TOAST_LIST,
  BLOCK_LIST_VALUE_INPUT,
  FLYOUT_ADD_TO_BLOCK_LIST_ITEM,
  FLYOUT_TAKE_ACTION_BUTTON,
  INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON,
  INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON,
  TOGGLE_FLYOUT_BUTTON,
} from '../screens/indicators';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { selectRange } from '../tasks/select_range';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

const BLOCK_LIST_NEW_NAME = 'new blocklist entry';

const fillBlocklistForm = () => {
  cy.get(BLOCK_LIST_NAME).type(BLOCK_LIST_NEW_NAME);
  cy.get(BLOCK_LIST_DESCRIPTION).type('the best description');
  cy.get(BLOCK_LIST_ADD_BUTTON).last().click();

  const text: string = `"${BLOCK_LIST_NEW_NAME}" has been added`;
  cy.get(BLOCK_LIST_TOAST_LIST).should('exist').and('contain.text', text);
};

describe('Block list with invalid indicators', () => {
  before(() => {
    esArchiverLoad('threat_intelligence/invalid_indicators_data');
    login();
  });

  beforeEach(() => {
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();
  });

  after(() => {
    esArchiverUnload('threat_intelligence/invalid_indicators_data');
  });

  it('should disabled the indicators table context menu item if invalid indicator', () => {
    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).eq(3).click();
    cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).should('be.disabled');
  });

  it('should disable the flyout context menu items if invalid indicator', () => {
    cy.get(TOGGLE_FLYOUT_BUTTON).eq(3).click({ force: true });
    cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
    cy.get(FLYOUT_ADD_TO_BLOCK_LIST_ITEM).should('be.disabled');
  });
});

describe('Block list interactions', () => {
  before(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
  });

  beforeEach(() => {
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();
  });

  after(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  it('should add to block list from the indicators table', () => {
    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).first().click();
    cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).first().click();

    fillBlocklistForm();
  });

  it('should add to block list from the indicator flyout', () => {
    cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
    cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
    cy.get(FLYOUT_ADD_TO_BLOCK_LIST_ITEM).first().click();

    fillBlocklistForm();
  });

  it('add to blocklist flyout should have the correct IoC id', () => {
    // first indicator is a valid indicator for add to blocklist feature
    const firstIndicatorId = 'd86e656455f985357df3063dff6637f7f3b95bb27d1769a6b88c7adecaf7763f';
    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).first().click();
    cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).first().click();

    cy.get(BLOCK_LIST_VALUE_INPUT(firstIndicatorId)).should('exist');

    cy.get(BLOCK_LIST_FLYOUT_CLOSE_BUTTON).click();

    // second indicator is a valid indicator for add to blocklist feature
    const secondIndicatorId = 'd3e2cf87eabf84ef929aaf8dad1431b3387f5a26de8ffb7a0c3c2a13f973c0ab';
    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).eq(1).click();
    cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).first().click();

    cy.get(BLOCK_LIST_VALUE_INPUT(secondIndicatorId)).should('exist');
  });
});
