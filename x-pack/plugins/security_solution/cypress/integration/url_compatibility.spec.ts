/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';

describe('URL compatibility', () => {
  it('Redirects to Detection alerts from old Detections URL', () => {
    loginAndWaitForPage(DETECTIONS);

    cy.url().should('include', '/security/detections');
  });
});
