/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_BUTTON_ICON, InspectButtonMetadata } from '../screens/inspect';

export const closesModal = () => {
  cy.get('[data-test-subj="modal-inspect-close"]').click();
};

export const clickInspectButton = (container: string) => {
  cy.get(`${container} ${INSPECT_BUTTON_ICON}`).should('exist');
  cy.get(`${container} ${INSPECT_BUTTON_ICON}`).invoke('show');
  cy.get(`${container} ${INSPECT_BUTTON_ICON}`).trigger('click', { force: true });
};

export const openStatsAndTables = (table: InspectButtonMetadata) => {
  if (table.tabId) {
    cy.get(table.tabId).invoke('show');
    cy.get(table.tabId).click({ force: true });
  }
  cy.get(table.id);
  if (table.altInspectId) {
    cy.get(table.altInspectId).invoke('show');
    cy.get(table.altInspectId).trigger('click', {
      force: true,
    });
  } else {
    clickInspectButton(table.id);
  }
};
