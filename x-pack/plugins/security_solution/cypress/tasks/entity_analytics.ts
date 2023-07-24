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

import { waitForPageToBeLoaded } from './common';

export const waitForAnomaliesToBeLoaded = () => {
  cy.waitUntil(() => {
    cy.reload();
    waitForPageToBeLoaded();
    return cy.get(ANOMALIES_TABLE_ROWS).then(
      (rows) => {
        if (rows.length > 1) {
          cy.log('anomalies loaded');
        }
      },
      { timeout: 12000 }
    );
  });
};

export const enableJob = () => {
  cy.get(ANOMALIES_TABLE_ENABLE_JOB_BUTTON).click();
};

export const navigateToNextPage = () => {
  cy.get(ANOMALIES_TABLE_NEXT_PAGE_BUTTON).click();
};
