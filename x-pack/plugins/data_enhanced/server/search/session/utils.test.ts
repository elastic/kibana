/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequestHash } from './utils';

describe('data/search/session utils', () => {
  describe('createRequestHash', () => {
    it('ignores `preference`', () => {
      const request = {
        foo: 'bar',
      };

      const withPreference = {
        ...request,
        preference: 1234,
      };

      expect(createRequestHash(request)).toEqual(createRequestHash(withPreference));
    });
  });
});
