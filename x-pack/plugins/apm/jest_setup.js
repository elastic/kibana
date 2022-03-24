/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* global jest */

// When a `console.error` is encountered, throw the error to make the test fail.
// This effectively treats logged errors during the test run as failures.
jest.spyOn(console, 'error').mockImplementation((message) => {
  throw new Error(message);
});
