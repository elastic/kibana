/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ensureAuthorized } from './ensure_authorized';

export const mockEnsureAuthorized = jest.fn() as jest.MockedFunction<typeof ensureAuthorized>;

jest.mock('./ensure_authorized', () => {
  return {
    ...jest.requireActual('./ensure_authorized'),
    ensureAuthorized: mockEnsureAuthorized,
  };
});
