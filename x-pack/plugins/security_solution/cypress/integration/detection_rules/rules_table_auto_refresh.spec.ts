/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_CHECKBOX, REFRESH_SETTINGS_SWITCH } from '../../screens/alerts_detection_rules';
import {
  changeRowsPerPageTo,
  checkAutoRefresh,
  waitForRulesTableToBeLoaded,
  selectAllRules,
  openRefreshSettingsPopover,
  clearAllRuleSelection,
  selectNumberOfRules,
  mockGlobalClock,
} from '../../tasks/alerts_detection_rules';
import { login, visit } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { getNewRule } from '../../objects/rule';

const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000;

describe('Alerts detection rules table auto-refresh', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRule(getNewRule(), '1');
    createCustomRule(getNewRule(), '2');
    createCustomRule(getNewRule(), '3');
    createCustomRule(getNewRule(), '4');
  });

  it('Auto refreshes rules', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);

    mockGlobalClock();
    waitForRulesTableToBeLoaded();

    // mock 1 minute passing to make sure refresh is conducted
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'be.visible');
  });

  it('should prevent table from rules refetch if any rule selected', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);

    mockGlobalClock();
    waitForRulesTableToBeLoaded();

    selectNumberOfRules(1);

    // mock 1 minute passing to make sure refresh is not conducted
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'not.exist');

    // ensure rule is still selected
    cy.get(RULE_CHECKBOX).first().should('be.checked');
  });

  it('should stop auto refresh when any rule selected', () => {
    createCustomRule(getNewRule(), '5');
    createCustomRule(getNewRule(), '6');

    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    changeRowsPerPageTo(5);

    openRefreshSettingsPopover();

    // check refresh settings if it's enabled before selecting
    cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'true');

    selectAllRules();

    // auto refresh should be disabled after rules selected
    cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'false');

    clearAllRuleSelection();

    // after all rules unselected, auto refresh should renew
    cy.get(REFRESH_SETTINGS_SWITCH).should('have.attr', 'aria-checked', 'true');
  });
});
