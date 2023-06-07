/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QUERY_INPUT } from '../screens/indicators';

/**
 * Nvigate to specific page in indicators table
 */
export const navigateToIndicatorsTablePage = (index: number) => {
  cy.get(`[data-test-subj="pagination-button-${index}"]`).click();
};

/**
 * Clears text in KQL bar
 */
export const enterQuery = (text: string) => {
  cy.get(QUERY_INPUT).should('exist').focus().type(text);
};

/**
 * Clears text in KQL bar
 */
export const clearQuery = () => {
  cy.get(QUERY_INPUT).should('exist').focus().clear();
};
