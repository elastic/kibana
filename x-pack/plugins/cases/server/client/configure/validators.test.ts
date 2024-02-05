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
} from './validators';

describe('validators', () => {
  describe('validateCustomFieldTypesInRequest', () => {
    it('throws an error with the keys of customFields in request that have invalid types', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE, label: 'label 1' },
            { key: '2', type: CustomFieldTypes.TEXT, label: 'label 2' },
          ],

          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid custom field types in request for the following labels: \\"label 1\\", \\"label 2\\""`
      );
    });

    it('throws an error when not all custom field types are invalid', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE, label: 'label 1' },
            { key: '2', type: CustomFieldTypes.TOGGLE, label: 'label 2' },
          ],

          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid custom field types in request for the following labels: \\"label 1\\""`
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
            { key: '1', type: CustomFieldTypes.TOGGLE, label: 'label 1' },
            { key: '2', type: CustomFieldTypes.TEXT, label: 'label 2' },
          ],
          originalCustomFields: [],
        })
      ).not.toThrow();
    });
  });

  describe('validateOptionalCustomFieldsInRequest', () => {
    it('does not throw an error for properly constructed optional custom fields', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: false, label: 'label 1' },
            { key: '2', required: false, label: 'label 2' },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw an error for required custom fields with default values', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: true, defaultValue: false, label: 'label 1' },
            { key: '2', required: true, defaultValue: 'foobar', label: 'label 2' },
          ],
        })
      ).not.toThrow();
    });

    it('throws an error even if the default value has the correct type', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: false, defaultValue: false, label: 'label 1' },
            { key: '2', required: false, defaultValue: 'foobar', label: 'label 2' },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: \\"label 1\\", \\"label 2\\""`
      );
    });

    it('throws an error for other falsy defaultValues (null)', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [
            { key: '1', required: false, defaultValue: null, label: 'label 1' },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: \\"label 1\\""`
      );
    });

    it('throws an error for other falsy defaultValues (0)', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [{ key: '1', required: false, defaultValue: 0, label: 'label 1' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: \\"label 1\\""`
      );
    });

    it('throws an error for other falsy defaultValues (empty string)', () => {
      expect(() =>
        validateOptionalCustomFieldsInRequest({
          requestCustomFields: [{ key: '1', required: false, defaultValue: '', label: 'label 1' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following optional custom fields try to define a default value: \\"label 1\\""`
      );
    });
  });
});
