/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_ACTION_WRAPPER,
  CASE_COMMENT_EXTERNAL_REFERENCE,
  CASE_ELLIPSE_BUTTON,
  CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON,
  CASE_ELLIPSE_DELETE_CASE_OPTION,
  CREAT_CASE_BUTTON,
  FLYOUT_ADD_TO_EXISTING_CASE_ITEM,
  FLYOUT_ADD_TO_NEW_CASE_ITEM,
  FLYOUT_TAKE_ACTION_BUTTON,
  INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON,
  INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON,
  INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON,
  NEW_CASE_CREATE_BUTTON,
  NEW_CASE_DESCRIPTION_INPUT,
  NEW_CASE_NAME_INPUT,
  SELECT_EXISTING_CASE,
  TOGGLE_FLYOUT_BUTTON,
  VIEW_CASE_TOASTER_LINK,
} from '../screens/indicators';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { selectRange } from '../tasks/select_range';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';
const CASES = 'app/security/cases';

const createNewCaseFromCases = () => {
  cy.visit(CASES);
  cy.get(CREAT_CASE_BUTTON).click();
  cy.get(NEW_CASE_NAME_INPUT).click().type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).click().type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).click();
};

const createNewCaseFromTI = () => {
  cy.get(NEW_CASE_NAME_INPUT).type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).click();
};

const selectExistingCase = () => {
  cy.wait(1000); // TODO find a better way to wait for the table to render
  cy.get(SELECT_EXISTING_CASE).should('exist').contains('Select').click();
};

const navigateToNewCaseAndCheckAddedComment = () => {
  cy.get(VIEW_CASE_TOASTER_LINK).click();
  cy.get(CASE_COMMENT_EXTERNAL_REFERENCE)
    .should('exist')
    .and('contain.text', 'added an indicator of compromise')
    .and('contain.text', 'Indicator name')
    .and('contain.text', 'Indicator type')
    .and('contain.text', 'Feed name');
};

const deleteCase = () => {
  cy.get(CASE_ACTION_WRAPPER).find(CASE_ELLIPSE_BUTTON).click();
  cy.get(CASE_ELLIPSE_DELETE_CASE_OPTION).click();
  cy.get(CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON).click();
};

describe('Cases with invalid indicators', () => {
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

  it('should disable the indicators table context menu items if invalid indicator', () => {
    const documentsNumber = 22;
    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON)
      .eq(documentsNumber - 1)
      .click();
    cy.get(INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON).should('be.disabled');
    cy.get(INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON).should('be.disabled');
  });

  it('should disable the flyout context menu items if invalid indicator', () => {
    const documentsNumber = 22;
    cy.get(TOGGLE_FLYOUT_BUTTON)
      .eq(documentsNumber - 1)
      .click({ force: true });
    cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
    cy.get(FLYOUT_ADD_TO_EXISTING_CASE_ITEM).should('be.disabled');
    cy.get(FLYOUT_ADD_TO_NEW_CASE_ITEM).should('be.disabled');
  });
});

describe('Cases interactions', () => {
  before(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
  });

  after(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  it('should add to existing case when clicking on the button in the indicators table', () => {
    createNewCaseFromCases();

    cy.visit(THREAT_INTELLIGENCE);
    selectRange();

    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).first().click();
    cy.get(INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON).first().click();

    selectExistingCase();
    navigateToNewCaseAndCheckAddedComment();
    deleteCase();
  });

  it('should add to new case when clicking on the button in the indicators table', () => {
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();

    cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).first().click();
    cy.get(INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON).first().click();
    createNewCaseFromTI();

    navigateToNewCaseAndCheckAddedComment();
    deleteCase();
  });

  it('should add to existing case when clicking on the button in the indicators flyout', () => {
    createNewCaseFromCases();

    cy.visit(THREAT_INTELLIGENCE);
    selectRange();

    cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
    cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
    cy.get(FLYOUT_ADD_TO_EXISTING_CASE_ITEM).first().click();

    selectExistingCase();
    navigateToNewCaseAndCheckAddedComment();
    deleteCase();
  });

  it('should add to new case when clicking on the button in the indicators flyout', () => {
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();

    cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
    cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
    cy.get(FLYOUT_ADD_TO_NEW_CASE_ITEM).first().click();
    createNewCaseFromTI();

    navigateToNewCaseAndCheckAddedComment();
    deleteCase();
  });
});
