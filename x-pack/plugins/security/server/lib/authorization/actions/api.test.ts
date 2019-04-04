/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiActions } from './api';

const version = '1.0.0-zeta1';

describe('#all', () => {
  test('returns `api:${version}:*`', () => {
    const apiActions = new ApiActions(version);
    expect(apiActions.all).toBe('api:1.0.0-zeta1:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const apiActions = new ApiActions(version);
      expect(() => apiActions.get(operation)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `api:${version}:${operation}`', () => {
    const apiActions = new ApiActions(version);
    expect(apiActions.get('foo-operation')).toBe('api:1.0.0-zeta1:foo-operation');
  });
});
