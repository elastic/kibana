/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_CHECKBOX,
  REFRESH_RULES_STATUS,
  REFRESH_SETTINGS_SWITCH,
  REFRESH_SETTINGS_SELECTION_NOTE,
} from '../../screens/alerts_detection_rules';
import {
  changeRowsPerPageTo,
  checkAutoRefresh,
  waitForRulesTableToBeLoaded,
  selectAllRules,
  openRefreshSettingsPopover,
  clearAllRuleSelection,
  selectNumberOfRules,
  mockGlobalClock,
  disableAutoRefresh,
  checkAutoRefreshIsDisabled,
  checkAutoRefreshIsEnabled,
} from '../../tasks/alerts_detection_rules';
import { login, visit, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { getNewRule } from '../../objects/rule';

const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000;

describe('Alerts detection rules table auto-refresh', () => {
  before(() => {
    cleanKibana();
    login();
    for (let i = 1; i < 7; i += 1) {
      createCustomRule({ ...getNewRule(), name: `Test rule ${i}` }, `${i}`);
    }
  });

  it('Auto refreshes rules', () => {
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);

    waitForRulesTableToBeLoaded();

    // ensure rules have rendered. As there is no user interaction in this test,
    // rules were not rendered before test completes
    cy.get(RULE_CHECKBOX).should('have.length', 6);

    // // mock 1 minute passing to make sure refresh is conducted
    mockGlobalClock();
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'be.visible');

    cy.contains(REFRESH_RULES_STATUS, 'Updated now');
  });

  it('should prevent table from rules refetch if any rule selected', () => {
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);

    waitForRulesTableToBeLoaded();

    selectNumberOfRules(1);

    // mock 1 minute passing to make sure refresh is not conducted
    mockGlobalClock();
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'not.exist');

    // ensure rule is still selected
    cy.get(RULE_CHECKBOX).first().should('be.checked');

    cy.get(REFRESH_RULES_STATUS).should('have.not.text', 'Updated now');
  });

  it('should disable auto refresh when any rule selected and enable it after rules unselected', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    changeRowsPerPageTo(5);

    // check refresh settings if it's enabled before selecting
    openRefreshSettingsPopover();
    checkAutoRefreshIsEnabled();

    selectAllRules();

    // auto refresh should be disabled after rules selected
    openRefreshSettingsPopover();
    checkAutoRefreshIsDisabled();

    // if any rule selected, refresh switch should be disabled and help note to users should displayed
    cy.get(REFRESH_SETTINGS_SWITCH).should('be.disabled');
    cy.contains(
      REFRESH_SETTINGS_SELECTION_NOTE,
      'Note: Refresh is disabled while there is an active selection.'
    );

    clearAllRuleSelection();

    // after all rules unselected, auto refresh should renew
    openRefreshSettingsPopover();
    checkAutoRefreshIsEnabled();
  });

  it('should not enable auto refresh after rules were unselected if auto refresh was disabled', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    changeRowsPerPageTo(5);

    openRefreshSettingsPopover();
    disableAutoRefresh();

    selectAllRules();

    openRefreshSettingsPopover();
    checkAutoRefreshIsDisabled();

    clearAllRuleSelection();

    // after all rules unselected, auto refresh should still be disabled
    openRefreshSettingsPopover();
    checkAutoRefreshIsDisabled();
  });
});
