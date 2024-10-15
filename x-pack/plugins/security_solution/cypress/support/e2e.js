/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './commands';
import 'cypress-real-events/support';
import 'cypress-pipe';
import registerCypressGrep from '@cypress/grep';

registerCypressGrep();

Cypress.on('uncaught:exception', () => {
  return false;
});
