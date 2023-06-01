/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closeFlyout,
  openFlyout,
  openFlyoutTakeAction,
  openIndicatorsTableMoreActions,
} from '../tasks/common';
import {
  deleteBlocklistEntry,
  fillBlocklistForm,
  openAddToBlockListFlyoutFromTable,
  openAddToBlocklistFromFlyout,
} from '../tasks/blocklist';
import { navigateToBlocklist, navigateToThreatIntelligence } from '../tasks/common';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { selectRange } from '../tasks/select_range';
import {
  BLOCK_LIST_VALUE_INPUT,
  FLYOUT_ADD_TO_BLOCK_LIST_ITEM,
  INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON,
  SAVED_BLOCK_LIST_DESCRIPTION,
  SAVED_BLOCK_LIST_NAME,
} from '../screens/blocklist';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

const BLOCK_LIST_NEW_NAME = 'new blocklist entry';
const BLOCK_LIST_NEW_DESCRIPTION = 'the best description';

describe('Block list with invalid indicators', { testIsolation: false }, () => {
  before(() => {
    esArchiverLoad('threat_intelligence/invalid_indicators_data');
    login();
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();
  });

  after(() => {
    esArchiverUnload('threat_intelligence/invalid_indicators_data');
  });

  it('should disabled the indicators table context menu item if invalid indicator', () => {
    openIndicatorsTableMoreActions(3);
    cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).should('be.disabled');
  });

  it('should disable the flyout context menu items if invalid indicator', () => {
    openFlyout(3);
    openFlyoutTakeAction();
    cy.get(FLYOUT_ADD_TO_BLOCK_LIST_ITEM).should('be.disabled');
  });
});

describe('Block list interactions', { testIsolation: false }, () => {
  before(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();
  });

  after(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  it('should add to block list from the indicators table', () => {
    openIndicatorsTableMoreActions(0);
    openAddToBlockListFlyoutFromTable();
    fillBlocklistForm(BLOCK_LIST_NEW_NAME, BLOCK_LIST_NEW_DESCRIPTION);
    navigateToBlocklist();

    cy.get(SAVED_BLOCK_LIST_NAME).should('have.text', BLOCK_LIST_NEW_NAME);
    cy.get(SAVED_BLOCK_LIST_DESCRIPTION).should('have.text', BLOCK_LIST_NEW_DESCRIPTION);

    deleteBlocklistEntry();
    navigateToThreatIntelligence();
  });

  it('should add to block list from the indicator flyout', () => {
    openFlyout(0);
    openFlyoutTakeAction();
    openAddToBlocklistFromFlyout();
    fillBlocklistForm(BLOCK_LIST_NEW_NAME, BLOCK_LIST_NEW_DESCRIPTION);
    closeFlyout();
    navigateToBlocklist();

    cy.get(SAVED_BLOCK_LIST_NAME).should('have.text', BLOCK_LIST_NEW_NAME);
    cy.get(SAVED_BLOCK_LIST_DESCRIPTION).should('have.text', BLOCK_LIST_NEW_DESCRIPTION);

    deleteBlocklistEntry();
    navigateToThreatIntelligence();
  });

  it('add to blocklist flyout should have the correct IoC id', () => {
    // first indicator is a valid indicator for add to blocklist feature
    const firstIndicatorId = 'd86e656455f985357df3063dff6637f7f3b95bb27d1769a6b88c7adecaf7763f';
    openIndicatorsTableMoreActions(0);
    openAddToBlockListFlyoutFromTable();

    cy.get(BLOCK_LIST_VALUE_INPUT(firstIndicatorId)).should('exist');

    closeFlyout();

    // second indicator is a valid indicator for add to blocklist feature
    const secondIndicatorId = 'd3e2cf87eabf84ef929aaf8dad1431b3387f5a26de8ffb7a0c3c2a13f973c0ab';
    openIndicatorsTableMoreActions(1);
    openAddToBlockListFlyoutFromTable();

    cy.get(BLOCK_LIST_VALUE_INPUT(secondIndicatorId)).should('exist');
  });
});
