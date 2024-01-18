/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import {
  validateCustomFieldTypesInRequest,
  validateOptionalCustomFieldsInRequest,
  validateRequiredCustomFieldsInRequest,
} from './validators';

describe('validators', () => {
  describe('validateCustomFieldTypesInRequest', () => {
    it('throws an error with the keys of customFields in request that have invalid types', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE },
            { key: '2', type: CustomFieldTypes.TEXT },
          ],
          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid custom field types in request for the following keys: 1,2"`
      );
    });

    it('throws an error when not all custom field types are invalid', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid custom field types in request for the following keys: 1"`
      );
    });

    it('does not throw if the request has no customFields', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw if the current configuration has no customFields', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE },
            { key: '2', type: CustomFieldTypes.TEXT },
          ],
          originalCustomFields: [],
        })
      ).not.toThrow();
    });
  });

  describe('validateRequiredCustomFieldsInRequest', () => {
    it('does not throw an error for not required custom fields', () => {
      expect(() =>
        validateRequiredCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: false },
            { key: '2', required: false },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw an error for required custom fields with default values', () => {
      expect(() =>
        validateRequiredCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: true, defaultValue: false },
            { key: '2', required: true, defaultValue: 'foobar' },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw an error for other falsy defaultValues (0)', () => {
      expect(() =>
        validateRequiredCustomFieldsInRequest({
          // @ts-ignore intended
          requestCustomFields: [{ key: '1', required: true, defaultValue: 0 }],
        })
      ).not.toThrow();
    });

    it('does not throw an error for other falsy defaultValues (empty string)', () => {
      expect(() =>
        validateRequiredCustomFieldsInRequest({
          requestCustomFields: [{ key: '1', required: true, defaultValue: '' }],
        })
      ).not.toThrow();
    });

    it('throws an error with the keys of required customFields missing a default value', () => {
      expect(() =>
        validateRequiredCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: true, defaultValue: null },
            { key: '2', required: true },
            { key: '3', required: false },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following required custom fields are missing the default value: 1,2"`
      );
    });
  });

  describe('validateOptionalCustomFieldsInRequest', () => {
    it('does not throw an error for properly constructed optional custom fields', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: false },
            { key: '2', required: false },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw an error for required custom fields with default values', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: true, defaultValue: false },
            { key: '2', required: true, defaultValue: 'foobar' },
          ],
        })
      ).not.toThrow();
    });

    it('throws an error even if the default value has the correct type', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: false, defaultValue: false },
            { key: '2', required: false, defaultValue: 'foobar' },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: 1,2"`
      );
    });

    it('throws an error for other falsy defaultValues (null)', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [{ key: '1', required: false, defaultValue: null }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: 1"`
      );
    });

    it('throws an error for other falsy defaultValues (0)', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [{ key: '1', required: false, defaultValue: 0 }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: 1"`
      );
    });

    it('throws an error for other falsy defaultValues (empty string)', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [{ key: '1', required: false, defaultValue: '' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: 1"`
      );
    });
  });
});
