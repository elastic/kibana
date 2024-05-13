/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDuplicatedKeysInRequest } from './validators';

describe('validators', () => {
  describe('validateDuplicatedKeysInRequest', () => {
    it('returns fields in request that have duplicated keys', () => {
      expect(() =>
        validateDuplicatedKeysInRequest({
          requestFields: [
            {
              key: 'triplicated_key',
            },
            {
              key: 'triplicated_key',
            },
            {
              key: 'triplicated_key',
            },
            {
              key: 'duplicated_key',
            },
            {
              key: 'duplicated_key',
            },
          ],

          fieldName: 'foobar',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated foobar keys in request: triplicated_key,duplicated_key"`
      );
    });

    it('does not throw if no fields in request have duplicated keys', () => {
      expect(() =>
        validateDuplicatedKeysInRequest({
          requestFields: [
            {
              key: '1',
            },
            {
              key: '2',
            },
          ],
          fieldName: 'foobar',
        })
      ).not.toThrow();
    });
  });
});
