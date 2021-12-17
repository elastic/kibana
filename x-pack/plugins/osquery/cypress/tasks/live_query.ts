/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIVE_QUERY_EDITOR } from '../screens/live_query';

export const DEFAULT_QUERY = 'select * from processes;';

export const selectAllAgents = () => {
  cy.react('EuiComboBox', { props: { placeholder: 'Select agents or groups' } }).click();
  cy.react('EuiFilterSelectItem').contains('All agents').click();
};

export const inputQuery = (query: string) => cy.get(LIVE_QUERY_EDITOR).type(query);

export const submitQuery = () => cy.contains('Submit').click();

export const checkResults = () =>
  cy.get('[data-test-subj="dataGridRowCell"]', { timeout: 60000 }).should('have.lengthOf.above', 0);
