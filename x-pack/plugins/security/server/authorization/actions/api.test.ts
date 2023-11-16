/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiActions } from './api';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const apiActions = new ApiActions();
      expect(() => apiActions.get(operation)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `api:${operation}`', () => {
    const apiActions = new ApiActions();
    expect(apiActions.get('foo-operation')).toBe('api:foo-operation');
  });
});
