/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RenderError } from './errors';

describe('errors', () => {
  it('creates a test error', () => {
    // eslint-disable-next-line new-cap
    const throwTestError = () => RenderError();
    expect(throwTestError.name).toBe('throwTestError');
  });
});
