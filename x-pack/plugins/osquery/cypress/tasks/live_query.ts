/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIVE_QUERY_EDITOR } from '../screens/live_query';

export const DEFAULT_QUERY = 'select * from processes;';
export const BIG_QUERY = 'select * from processes, users limit 110;';

export const selectAllAgents = () => {
  cy.react('AgentsTable').find('input').should('not.be.disabled');
  cy.react('AgentsTable EuiComboBox', {
    props: { placeholder: 'Select agents or groups to query' },
  }).click();
  cy.react('EuiFilterSelectItem').contains('All agents').should('exist');
  cy.react('AgentsTable EuiComboBox').type('{downArrow}{enter}{esc}');
  cy.contains('2 agents selected.');
};

export const clearInputQuery = () =>
  cy.get(LIVE_QUERY_EDITOR).click().type(`{selectall}{backspace}`);

export const inputQuery = (query: string, options?: { parseSpecialCharSequences: boolean }) =>
  cy.get(LIVE_QUERY_EDITOR).type(query, options);

export const submitQuery = () => {
  cy.wait(1000); // wait for the validation to trigger - cypress is way faster than users ;)
  cy.contains('Submit').click();
};

// sometimes the results get stuck in the tests, this is a workaround
export const checkResults = () => {
  cy.getBySel('osqueryResultsTable').then(($table) => {
    if ($table.find('div .euiDataGridRow').length > 0) {
      cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.lengthOf.above', 0);
    } else {
      cy.getBySel('osquery-status-tab').click();
      cy.getBySel('osquery-results-tab').click();
      cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.lengthOf.above', 0);
    }
  });
};

export const typeInECSFieldInput = (text: string, index = 0) =>
  cy.getBySel('ECS-field-input').eq(index).type(text);
export const typeInOsqueryFieldInput = (text: string, index = 0) =>
  cy.react('OsqueryColumnFieldComponent').eq(index).react('ResultComboBox').type(text);

export const getOsqueryFieldTypes = (value: 'Osquery value' | 'Static value', index = 0) => {
  cy.getBySel(`osquery-result-type-select-${index}`).click();
  cy.contains(value).click();

  if (value === 'Static value') {
    cy.contains('Osquery value').should('not.exist');
  } else {
    cy.contains('Static value').should('not.exist');
  }
};

export const findFormFieldByRowsLabelAndType = (label: string, text: string) => {
  cy.react('EuiFormRow', { props: { label } }).type(text);
};

export const deleteAndConfirm = (type: string) => {
  cy.react('EuiButton').contains(`Delete ${type}`).click();
  cy.contains(`Are you sure you want to delete this ${type}?`);
  cy.react('EuiButton').contains('Confirm').click();
  cy.get('[data-test-subj="globalToastList"]')
    .first()
    .contains('Successfully deleted')
    .contains(type);
};

export const findAndClickButton = (text: string) => {
  cy.react('EuiButton').contains(text).click();
};

export const toggleRuleOffAndOn = (ruleName: string) => {
  cy.visit('/app/security/rules');
  cy.contains(ruleName);
  cy.wait(2000);
  cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
  cy.getBySel('ruleSwitch').click();
  cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'false');
  cy.getBySel('ruleSwitch').click();
  cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
};

export const loadAlertsEvents = () => {
  cy.visit('/app/security/alerts');
  cy.getBySel('header-page-title').contains('Alerts').should('exist');
  cy.getBySel('expand-event')
    .first()
    .within(() => {
      cy.get(`[data-is-loading="true"]`).should('exist');
    });
  cy.getBySel('expand-event')
    .first()
    .within(() => {
      cy.get(`[data-is-loading="true"]`).should('not.exist');
    });
};

export const addToCase = () => {
  cy.contains('Add to Case').click();
  cy.contains('Select case');
  cy.getBySelContains('cases-table-row-');
  cy.getBySelContains('cases-table-row-select-').click();
};

export const addLastLiveQueryToCase = () => {
  cy.waitForReact();
  cy.react('CustomItemAction', {
    props: { index: 1 },
  })
    .first()
    .click();
  cy.contains('Live query details');
  addToCase();
};

const casesOsqueryResultRegex = /attached Osquery results[\s]?[\d]+[\s]?seconds ago/;
export const viewRecentCaseAndCheckResults = () => {
  cy.contains('View case').click();
  cy.contains(casesOsqueryResultRegex);
  checkResults();
};

export const checkActionItemsInResults = ({
  lens,
  discover,
  timeline,
  cases,
}: {
  discover: boolean;
  lens: boolean;
  cases: boolean;
  timeline: boolean;
}) => {
  cy.contains('View in Discover').should(discover ? 'exist' : 'not.exist');
  cy.contains('View in Lens').should(lens ? 'exist' : 'not.exist');
  cy.contains('Add to Case').should(cases ? 'exist' : 'not.exist');
  cy.contains('Add to timeline investigation').should(timeline ? 'exist' : 'not.exist');
};

export const takeOsqueryActionWithParams = () => {
  cy.getBySel('take-action-dropdown-btn').click();
  cy.getBySel('osquery-action-item').click();
  cy.contains('1 agent selected.');
  inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
    parseSpecialCharSequences: false,
  });
  cy.contains('Advanced').click();
  typeInECSFieldInput('tags{downArrow}{enter}');
  cy.getBySel('osqueryColumnValueSelect').type('platform_like{downArrow}{enter}');
  cy.wait(1000);
  submitQuery();
  cy.getBySel('dataGridHeader').within(() => {
    cy.contains('tags');
  });
};
