/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomError } from './errors';

describe('getCustomError', () => {
  test('creates a custom error instance', () => {
    const error = getCustomError('MLCustomError', 'farequote is not defined');
    expect(error.message).toBe('farequote is not defined');
    expect(error.name).toBe('MLCustomError');
    // make sure that custom class extends Error
    expect(error).toBeInstanceOf(Error);
  });
});
