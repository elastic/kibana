/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_BULK_EDIT_DATA_VIEWS_WARNING,
  RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX,
} from '../../screens/rules_bulk_edit';

import { DATA_VIEW_DETAILS, INDEX_PATTERNS_DETAILS } from '../../screens/rule_details';

import {
  waitForRulesTableToBeLoaded,
  goToRuleDetails,
  selectNumberOfRules,
} from '../../tasks/alerts_detection_rules';

import {
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  checkOverwriteDataViewCheckbox,
  checkOverwriteIndexPatternsCheckbox,
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
} from '../../tasks/rules_bulk_edit';

import { hasIndexPatterns, getDetails, assertDetailsNotExist } from '../../tasks/rule_details';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';
import {
  createCustomRule,
  createCustomIndicatorRule,
  createEventCorrelationRule,
  createThresholdRule,
  createNewTermsRule,
  createSavedQueryRule,
} from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules, postDataView } from '../../tasks/common';

import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getNewTermsRule,
} from '../../objects/rule';

import { esArchiverResetKibana } from '../../tasks/es_archiver';

const DATA_VIEW_ID = 'auditbeat';

const expectedIndexPatterns = ['index-1-*', 'index-2-*'];

const expectedNumberOfCustomRulesToBeEdited = 6;

const indexDataSource = { dataView: DATA_VIEW_ID, type: 'dataView' } as const;

const defaultRuleData = {
  dataSource: indexDataSource,
};

describe('Detection rules, bulk edit, data view', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    esArchiverResetKibana();

    postDataView(DATA_VIEW_ID);

    createCustomRule({ ...getNewRule(), ...defaultRuleData }, '1');
    createEventCorrelationRule({ ...getEqlRule(), ...defaultRuleData }, '2');
    createCustomIndicatorRule({ ...getNewThreatIndicatorRule(), ...defaultRuleData }, '3');
    createThresholdRule({ ...getNewThresholdRule(), ...defaultRuleData }, '4');
    createNewTermsRule({ ...getNewTermsRule(), ...defaultRuleData }, '5');
    createSavedQueryRule({ ...getNewRule(), ...defaultRuleData, savedId: 'mocked' }, '6');

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);

    waitForRulesTableToBeLoaded();
  });

  it('Add index patterns to custom rules with configured data view', () => {
    selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

    openBulkEditAddIndexPatternsForm();
    typeIndexPatterns(expectedIndexPatterns);
    submitBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule still has data view and index patterns field does not exist
    goToRuleDetails();
    getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
    assertDetailsNotExist(INDEX_PATTERNS_DETAILS);
  });

  it('Add index patterns to custom rules with configured data view when data view checkbox is checked', () => {
    selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

    openBulkEditAddIndexPatternsForm();
    typeIndexPatterns(expectedIndexPatterns);

    // click on data view overwrite checkbox, ensure warning is displayed
    cy.get(RULES_BULK_EDIT_DATA_VIEWS_WARNING).should('not.exist');
    checkOverwriteDataViewCheckbox();
    cy.get(RULES_BULK_EDIT_DATA_VIEWS_WARNING).should('be.visible');

    submitBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule has been updated with index patterns and data view does not exist
    goToRuleDetails();
    hasIndexPatterns(expectedIndexPatterns.join(''));
    assertDetailsNotExist(DATA_VIEW_DETAILS);
  });

  it('Overwrite index patterns in custom rules with configured data view', () => {
    selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

    openBulkEditAddIndexPatternsForm();
    typeIndexPatterns(expectedIndexPatterns);
    checkOverwriteIndexPatternsCheckbox();
    submitBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule still has data view and index patterns field does not exist
    goToRuleDetails();
    getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
    assertDetailsNotExist(INDEX_PATTERNS_DETAILS);
  });

  it('Overwrite index patterns in custom rules with configured data view when data view checkbox is checked', () => {
    selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

    openBulkEditAddIndexPatternsForm();
    typeIndexPatterns(expectedIndexPatterns);
    checkOverwriteIndexPatternsCheckbox();
    checkOverwriteDataViewCheckbox();

    submitBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule has been overwritten with index patterns and data view does not exist
    goToRuleDetails();
    hasIndexPatterns(expectedIndexPatterns.join(''));
    assertDetailsNotExist(DATA_VIEW_DETAILS);
  });

  it('Delete index patterns in custom rules with configured data view', () => {
    selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

    openBulkEditDeleteIndexPatternsForm();
    typeIndexPatterns(expectedIndexPatterns);

    // in delete form data view checkbox is absent
    cy.get(RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX).should('not.exist');

    submitBulkEditForm();

    waitForBulkEditActionToFinish({ rulesCount: expectedNumberOfCustomRulesToBeEdited });

    // check if rule still has data view and index patterns field does not exist
    goToRuleDetails();
    getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
  });
});
