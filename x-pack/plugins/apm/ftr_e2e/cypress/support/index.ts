/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

Cypress.on('uncaught:exception', (err, runnable) => {
  // @see https://stackoverflow.com/a/50387233/434980
  // ResizeObserver error can be safely ignored
  if (
    err.message.includes('ResizeObserver loop limit exceeded') ||
    err.message.includes('menu provider with id [csvReports]')
  ) {
    return false;
  }
});

import './commands';
