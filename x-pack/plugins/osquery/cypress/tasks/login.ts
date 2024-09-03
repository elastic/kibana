/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { disableNewFeaturesTours } from './navigation';
import { ServerlessRoleName } from '../support/roles';

// Login as a SOC_MANAGER to properly initialize Security Solution App
export const initializeDataViews = () => {
  cy.login(ServerlessRoleName.SOC_MANAGER);
  cy.visit('/app/security/alerts', {
    onBeforeLoad: (win) => disableNewFeaturesTours(win),
  });
  cy.getBySel('globalLoadingIndicator').should('exist');
  cy.getBySel('globalLoadingIndicator').should('not.exist');
  cy.getBySel('manage-alert-detection-rules').should('exist');
};
