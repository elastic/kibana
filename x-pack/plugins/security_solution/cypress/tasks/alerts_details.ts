/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  JSON_CONTENT,
  JSON_VIEW_TAB,
  TABLE_TAB,
  THREAT_INTEL_TAB,
} from '../screens/alerts_details';

export const openJsonView = () => {
  cy.get(JSON_VIEW_TAB).click();
};

export const openTable = () => {
  cy.get(TABLE_TAB).click();
};

export const openThreatIndicatorDetails = () => {
  cy.get(THREAT_INTEL_TAB).click();
};

export const scrollJsonViewToBottom = () => {
  cy.get(JSON_CONTENT).click({ force: true });
  cy.get(JSON_CONTENT).type('{pagedown}{pagedown}{pagedown}');
  cy.get(JSON_CONTENT).should('be.visible');
};
