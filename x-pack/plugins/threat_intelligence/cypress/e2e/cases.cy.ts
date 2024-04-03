/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  navigateToThreatIntelligence,
  openFlyout,
  openFlyoutTakeAction,
  openIndicatorsTableMoreActions,
} from '../tasks/common';
import {
  createNewCaseFromTI,
  navigateToCaseViaToaster,
  openAddToExistingCaseFlyoutFromTable,
  openAddToExistingCaseFromFlyout,
  openAddToNewCaseFlyoutFromTable,
  openAddToNewCaseFromFlyout,
  selectExistingCase,
} from '../tasks/cases';
import {
  CASE_COMMENT_EXTERNAL_REFERENCE,
  FLYOUT_ADD_TO_EXISTING_CASE_ITEM,
  FLYOUT_ADD_TO_NEW_CASE_ITEM,
  INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON,
  INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON,
} from '../screens/cases';
import { login, visit } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Cases with invalid indicators', { tags: '@ess' }, () => {
  beforeEach(() => {
    esArchiverLoad('threat_intelligence/invalid_indicators_data');
    login();
    visit(THREAT_INTELLIGENCE);
  });

  afterEach(() => {
    esArchiverUnload('threat_intelligence/invalid_indicators_data');
  });

  it.skip('should disable the indicators table context menu items and flyout context menu items', () => {
    const documentsNumber = 22;
    openIndicatorsTableMoreActions(documentsNumber - 1);

    cy.get(INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON).should('be.disabled');
    cy.get(INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON).should('be.disabled');

    openFlyout(documentsNumber - 1);
    openFlyoutTakeAction();

    cy.get(FLYOUT_ADD_TO_EXISTING_CASE_ITEM).should('be.disabled');
    cy.get(FLYOUT_ADD_TO_NEW_CASE_ITEM).should('be.disabled');
  });
});

describe('Cases interactions', { tags: '@ess' }, () => {
  beforeEach(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
    visit(THREAT_INTELLIGENCE);
  });

  afterEach(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  it.skip('should add to new case and to existing case from the indicators table and the flyout', () => {
    cy.log('should add to new case when clicking on the button in the indicators table');

    openIndicatorsTableMoreActions(0);
    openAddToNewCaseFlyoutFromTable();
    createNewCaseFromTI();
    navigateToCaseViaToaster();

    cy.get(CASE_COMMENT_EXTERNAL_REFERENCE)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');

    navigateToThreatIntelligence();

    cy.log('should add to existing case when clicking on the button in the indicators table');

    openIndicatorsTableMoreActions(0);
    openAddToExistingCaseFlyoutFromTable();
    selectExistingCase();
    navigateToCaseViaToaster();

    cy.get(CASE_COMMENT_EXTERNAL_REFERENCE)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');

    navigateToThreatIntelligence();

    cy.log('should add to new case when clicking on the button in the indicators flyout');

    openFlyout(0);
    openFlyoutTakeAction();
    openAddToNewCaseFromFlyout();
    createNewCaseFromTI();

    navigateToCaseViaToaster();
    cy.get(CASE_COMMENT_EXTERNAL_REFERENCE)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');

    navigateToThreatIntelligence();

    cy.log('should add to existing case when clicking on the button in the indicators flyout');

    openFlyout(0);
    openFlyoutTakeAction();
    openAddToExistingCaseFromFlyout();
    selectExistingCase();

    navigateToCaseViaToaster();
    cy.get(CASE_COMMENT_EXTERNAL_REFERENCE)
      .should('exist')
      .and('contain.text', 'added an indicator of compromise')
      .and('contain.text', 'Indicator name')
      .and('contain.text', 'Indicator type')
      .and('contain.text', 'Feed name');
  });
});
