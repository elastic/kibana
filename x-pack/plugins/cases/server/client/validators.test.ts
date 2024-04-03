/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDuplicatedCustomFieldKeysInRequest } from './validators';

describe('validators', () => {
  describe('validateDuplicatedCustomFieldKeysInRequest', () => {
    it('returns customFields in request that have duplicated keys', () => {
      expect(() =>
        validateDuplicatedCustomFieldKeysInRequest({
          requestCustomFields: [
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
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated custom field keys in request: triplicated_key,duplicated_key"`
      );
    });

    it('does not throw if no customFields in request have duplicated keys', () => {
      expect(() =>
        validateDuplicatedCustomFieldKeysInRequest({
          requestCustomFields: [
            {
              key: '1',
            },
            {
              key: '2',
            },
          ],
        })
      ).not.toThrow();
    });
  });
});
