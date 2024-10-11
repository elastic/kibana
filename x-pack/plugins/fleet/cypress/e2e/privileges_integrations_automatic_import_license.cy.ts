/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginAndWaitForPage, logout } from '../tasks/login';
import {
  CREATE_INTEGRATION_LANDING_PAGE,
  LICENSE_PAYWALL_CARD,
} from '../screens/integrations_automatic_import';
import { startBasicLicense, startTrialLicense } from '../tasks/api_calls/licensing';

describe('No enterprise License should show License Paywall', () => {
  beforeEach(() => {
    login();
    startBasicLicense();
  });

  afterEach(() => {
    startTrialLicense();
    logout();
  });

  it('Create Assistant is not accessible but upload is accessible', () => {
    loginAndWaitForPage(CREATE_INTEGRATION_LANDING_PAGE);
    cy.getBySel(LICENSE_PAYWALL_CARD).should('exist');
  });
});
