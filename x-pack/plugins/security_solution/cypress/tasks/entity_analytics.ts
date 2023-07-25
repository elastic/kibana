/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANOMALIES_TABLE_ROWS,
  ANOMALIES_TABLE_ENABLE_JOB_BUTTON,
  ANOMALIES_TABLE_NEXT_PAGE_BUTTON,
} from '../screens/entity_analytics';
import { ENTITY_ANALYTICS_URL } from '../urls/navigation';

import { visit } from './login';

export const waitForAnomaliesToBeLoaded = () => {
  cy.waitUntil(() => {
    visit(ENTITY_ANALYTICS_URL);
    cy.get('.euiBasicTable.euiBasicTable-loading').should('exist');
    cy.get('.euiBasicTable.euiBasicTable-loading').should('not.exist');
    return cy.get(ANOMALIES_TABLE_ROWS).then((tableRows) => tableRows.length > 1);
  });
};

export const enableJob = () => {
  cy.get(ANOMALIES_TABLE_ENABLE_JOB_BUTTON).click();
};

export const navigateToNextPage = () => {
  cy.get(ANOMALIES_TABLE_NEXT_PAGE_BUTTON).click();
};
