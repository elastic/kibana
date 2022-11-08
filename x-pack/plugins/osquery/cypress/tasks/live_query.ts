/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_FIELD,
  ALL_AGENTS_OPTION,
  LIVE_QUERY_EDITOR,
  SUBMIT_BUTTON,
} from '../screens/live_query';

export const selectAllAgents = () => {
  cy.get(AGENT_FIELD).first().click();
  return cy.get(ALL_AGENTS_OPTION).contains('All agents').click();
};

export const inputQuery = () => cy.get(LIVE_QUERY_EDITOR).type('select * from processes;');

export const submitQuery = () => cy.get(SUBMIT_BUTTON).contains('Submit').click();

export const checkResults = () =>
  cy.get('[data-test-subj="dataGridRowCell"]').should('have.lengthOf.above', 0);
