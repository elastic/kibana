/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import {
  validateDuplicatedCustomFieldKeysInRequest,
  validateRequiredCustomFields,
  validateCustomFieldKeysAgainstConfiguration,
  validateCustomFieldTypesInRequest,
} from './validation';

describe('validation', () => {
  describe('validateCustomFieldTypesInRequest', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns an empty array if all custom fields types in request match the configuration', () => {
      expect(
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              field: { value: ['this is a text field value', 'this is second'] },
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              field: { value: null },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual([]);
    });

    it('returns an empty array if no custom fields are in request', () => {
      expect(
        validateCustomFieldTypesInRequest({
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual([]);
    });

    it('returns an empty array if the configuration is undefined but no custom fields are in request', () => {
      expect(validateCustomFieldTypesInRequest({})).toEqual([]);
    });

    it('returns a single custom fields with invalid type', () => {
      expect(
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: null },
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: [true] },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual(['first_key']);
    });

    it('returns multiple custom fields with invalid types', () => {
      expect(
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: null },
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: [true] },
            },
            {
              key: 'third_key',
              type: CustomFieldTypes.TEXT,
              field: { value: ['abc'] },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'third_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual(['first_key', 'second_key', 'third_key']);
    });

    it('throws if configuration is missing and request has custom fields', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: null },
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });
  });

  describe('validateCustomFieldKeysAgainstConfiguration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns an empty array if all custom fields are in configuration', () => {
      expect(
        validateCustomFieldKeysAgainstConfiguration({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              field: { value: ['this is a text field value', 'this is second'] },
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT as const,
              field: { value: null },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual([]);
    });

    it('returns an empty array if no custom fields are in request', () => {
      expect(
        validateCustomFieldKeysAgainstConfiguration({
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual([]);
    });

    it('returns an empty array if no configuration found but no custom fields are in request', () => {
      expect(validateCustomFieldKeysAgainstConfiguration({})).toEqual([]);
    });

    it('returns invalid custom field keys', () => {
      expect(
        validateCustomFieldKeysAgainstConfiguration({
          requestCustomFields: [
            {
              key: 'invalid_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: null },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual(['invalid_key']);
    });

    it('throws if configuration is missing and request has custom fields', () => {
      expect(() =>
        validateCustomFieldKeysAgainstConfiguration({
          requestCustomFields: [
            {
              key: 'invalid_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: null },
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });
  });

  describe('validateDuplicatedCustomFieldKeysInRequest', () => {
    it('returns customFields in request that have duplicated keys', () => {
      expect(
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
      ).toEqual(['triplicated_key', 'duplicated_key']);
    });

    it('returns an empty array if no customFields in request have duplicated keys', () => {
      expect(
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
      ).toEqual([]);
    });
  });

  describe('validateRequiredCustomFields', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns an empty array if all required custom fields are in the request', () => {
      expect(
        validateRequiredCustomFields({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              field: { value: ['this is a text field value', 'this is second'] },
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              field: { value: null },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual([]);
    });

    it('returns an empty array if there are only optional custom fields in configuration', () => {
      expect(
        validateRequiredCustomFields({
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual([]);
    });

    it('returns an empty array if the configuration is undefined but no custom fields are in request', () => {
      expect(validateRequiredCustomFields({})).toEqual([]);
    });

    it('returns missing required custom fields', () => {
      expect(
        validateRequiredCustomFields({
          requestCustomFields: [
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: [true] },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: true,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: true,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toEqual(['first_key']);
    });

    it('throws if configuration is missing and request has custom fields', () => {
      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              field: { value: null },
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });
  });
});
