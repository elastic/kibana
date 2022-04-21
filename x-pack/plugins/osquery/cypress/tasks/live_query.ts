/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIVE_QUERY_EDITOR } from '../screens/live_query';

export const DEFAULT_QUERY = 'select * from processes;';
export const BIG_QUERY = 'select * from processes, users;';

export const selectAllAgents = () => {
  cy.react('EuiComboBox', { props: { placeholder: 'Select agents or groups' } }).type('All agents');
  cy.react('EuiFilterSelectItem').contains('All agents').should('exist');
  cy.react('EuiComboBox', { props: { placeholder: 'Select agents or groups' } }).type(
    '{downArrow}{enter}{esc}'
  );
  cy.contains('1 agent selected.');
};

export const inputQuery = (query: string) => cy.get(LIVE_QUERY_EDITOR).type(query);

export const submitQuery = () => cy.contains('Submit').click();

export const checkResults = () =>
  cy.getBySel('dataGridRowCell', { timeout: 60000 }).should('have.lengthOf.above', 0);

export const typeInECSFieldInput = (text: string) =>
  cy.getBySel('ECS-field-input').click().type(text);
export const typeInOsqueryFieldInput = (text: string) =>
  cy.react('OsqueryColumnFieldComponent').first().react('ResultComboBox').click().type(text);

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
