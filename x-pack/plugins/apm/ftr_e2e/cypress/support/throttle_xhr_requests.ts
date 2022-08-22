/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

beforeEach(() => {
  cy.intercept({ url: '*' }, (req) => {
    req.on('response', (res) => {
      res.setDelay(50); // 50ms delay
      res.setThrottle(5000); // 5mbps
    });
  });
});
