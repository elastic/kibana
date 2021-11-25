/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KIBANA_NAVIGATION_TOGGLE,
  SPACES_BUTTON,
  getGoToSpaceMenuItem,
} from '../screens/kibana_navigation';

export const navigateFromKibanaCollapsibleTo = (page: string) => {
  cy.get(page).click();
};

export const openKibanaNavigation = () => {
  cy.get(KIBANA_NAVIGATION_TOGGLE).click();
};

export const changeSpace = (space: string) => {
  cy.get(`${SPACES_BUTTON}`).click();
  cy.get(getGoToSpaceMenuItem(space)).click();
  cy.get(`[data-test-subj="space-avatar-${space}"]`).should('exist');
};
