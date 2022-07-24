/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENRICHMENT_COUNT_NOTIFICATION,
  JSON_VIEW_TAB,
  OVERVIEW_TAB,
  TABLE_TAB,
  FILTER_INPUT,
} from '../screens/alerts_details';

export const filterBy = (value: string) => {
  cy.get(FILTER_INPUT).type(value);
};

export const openJsonView = () => {
  cy.get(JSON_VIEW_TAB).click();
};

export const openOverview = () => {
  cy.get(OVERVIEW_TAB).click();
};

export const openTable = () => {
  cy.get(TABLE_TAB).click();
};

export const openThreatIndicatorDetails = () => {
  cy.get(ENRICHMENT_COUNT_NOTIFICATION).click();
};
