/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SetupServerApi } from 'msw/lib/node';

/**
 * This function wraps beforeAll, afterAll and beforeEach for setup MSW server into a single call.
 * That makes the describe code further down easier to read and makes
 * sure you don't forget the handlers. Can easily be shared between tests.
 */
export const jestSetup = (server: SetupServerApi) => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterAll(() => server.close());
  beforeEach(() => {
    server.resetHandlers();
  });
};
