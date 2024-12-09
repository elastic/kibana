/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateDuplicatedKeysInRequest,
  validateDuplicatedObservableTypesInRequest,
  validateDuplicatedObservablesInRequest,
} from './validators';

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

  describe('validateDuplicatedObservableTypesInRequest', () => {
    it('returns fields in request that have duplicated observable types', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: 'triplicated_label',
            },
            {
              label: 'triplicated_label',
            },
            {
              label: 'triplicated_label',
            },
            {
              label: 'duplicated_label',
            },
            {
              label: 'duplicated_label',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated observable types in request: triplicated_label,duplicated_label"`
      );
    });

    it('does not throw if no fields in request have duplicated observable types', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: '1',
            },
            {
              label: '2',
            },
          ],
        })
      ).not.toThrow();
    });

    it('does throw if the provided label duplicates builtin type', () => {
      expect(() =>
        validateDuplicatedObservableTypesInRequest({
          requestFields: [
            {
              label: 'email',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated observable types in request: email"`
      );
    });
  });

  describe('validateDuplicatedObservablesInRequest', () => {
    it('returns observables in request that have duplicated labels', () => {
      expect(() =>
        validateDuplicatedObservablesInRequest({
          requestFields: [
            {
              value: 'value',
              typeKey: 'typeKey',
            },
            {
              value: 'value',
              typeKey: 'typeKey',
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid duplicated observables in request."`);
    });

    it('does not throw if no fields in request have duplicated observables', () => {
      expect(() =>
        validateDuplicatedObservablesInRequest({
          requestFields: [
            {
              value: 'value',
              typeKey: 'typeKey',
            },
            {
              value: 'value 1',
              typeKey: 'typeKey',
            },
            {
              value: 'value',
              typeKey: 'typeKey 2',
            },
          ],
        })
      ).not.toThrow();
    });
  });
});
