/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeExecutionContext } from './execution_context';

describe('makeExecutionContext', () => {
  test('returns basic fields if nothing is provided', () => {
    const context = makeExecutionContext({});
    expect(context).toStrictEqual({
      name: 'maps',
      type: 'application',
    });
  });

  test('merges in context', () => {
    const context = makeExecutionContext({ id: '123' });
    expect(context).toStrictEqual({
      name: 'maps',
      type: 'application',
      id: '123',
    });
  });

  test('omits undefined values', () => {
    const context = makeExecutionContext({ id: '123', description: undefined });
    expect(context).toStrictEqual({
      name: 'maps',
      type: 'application',
      id: '123',
    });
  });
});
