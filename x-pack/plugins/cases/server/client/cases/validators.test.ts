/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldsConfiguration, CaseCustomFields } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import type { CasesSearchRequest } from '../../../common/types/api';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import {
  validateCustomFieldKeysAgainstConfiguration,
  validateCustomFieldTypesInRequest,
  validateRequiredCustomFields,
  validateSearchCasesCustomFields,
} from './validators';

describe('validators', () => {
  describe('validateCustomFieldTypesInRequest', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not throw if all custom fields types in request match the configuration', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'this is a text field value',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: null,
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
      ).not.toThrow();
    });

    it('does not throw if no custom fields are in request', () => {
      expect(() =>
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
      ).not.toThrow();
    });

    it('does not throw if the configuration is undefined but no custom fields are in request', () => {
      expect(() => validateCustomFieldTypesInRequest({})).not.toThrow();
    });

    it('throws for a single invalid type', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              value: null,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],

          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'first label',
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
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following custom fields have the wrong type in the request: \\"first label\\""`
      );
    });

    it('throws for multiple custom fields with invalid types', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              value: null,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'third_key',
              type: CustomFieldTypes.TEXT,
              value: 'abc',
            },
          ],

          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'first label',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT,
              label: 'second label',
              required: false,
            },
            {
              key: 'third_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'third label',
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following custom fields have the wrong type in the request: \\"first label\\", \\"second label\\", \\"third label\\""`
      );
    });

    it('throws with label unknown for missing custom field labels', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT,
              value: 'foobar',
            },
          ],

          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT,
              required: false,
            },
          ] as CustomFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following custom fields have the wrong type in the request: \\"Unknown\\""`
      );
    });

    it('throws if configuration is missing and request has custom fields', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TOGGLE,
              value: null,
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

    it('does not throw if all custom fields are in configuration', () => {
      expect(() =>
        validateCustomFieldKeysAgainstConfiguration({
          requestCustomFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'this is a text field value',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT as const,
              value: null,
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
      ).not.toThrow();
    });

    it('does not throw if no custom fields are in request', () => {
      expect(() =>
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
      ).not.toThrow();
    });

    it('does not throw if no configuration found but no custom fields are in request', () => {
      expect(() => validateCustomFieldKeysAgainstConfiguration({})).not.toThrow();
    });

    it('throws if there are invalid custom field keys', () => {
      expect(() =>
        validateCustomFieldKeysAgainstConfiguration({
          requestCustomFields: [
            {
              key: 'invalid_key',
              type: CustomFieldTypes.TOGGLE,
              value: null,
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
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid custom field keys: invalid_key"`);
    });

    it('throws if configuration is missing and request has custom fields', () => {
      expect(() =>
        validateCustomFieldKeysAgainstConfiguration({
          requestCustomFields: [
            {
              key: 'invalid_key',
              type: CustomFieldTypes.TOGGLE,
              value: null,
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });
  });

  describe('validateRequiredCustomFields', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not throw if all required custom fields are in the request', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
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
      ];

      const requestCustomFields: CaseCustomFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          value: 'this is a text field value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE as const,
          value: true,
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields,
          customFieldsConfiguration,
        })
      ).not.toThrow();
    });

    it('does not throw if all missing required custom fields have default values', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'foo',
          required: true,
          defaultValue: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'foo',
          required: true,
          defaultValue: false,
        },
      ];

      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields: [],
          customFieldsConfiguration,
        })
      ).not.toThrow();
    });

    it('does not throw if there are only optional custom fields in configuration', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
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
      ];

      expect(() =>
        validateRequiredCustomFields({
          customFieldsConfiguration,
        })
      ).not.toThrow();
    });

    it('does not throw if the configuration is undefined but no custom fields are in request', () => {
      expect(() => validateRequiredCustomFields({})).not.toThrow();
    });

    it('throws if there are missing required custom fields without a default value', () => {
      const requestCustomFields: CaseCustomFields = [
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
      ];
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'missing field 1',
          required: true,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'foo',
          required: true,
          defaultValue: null,
        },
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'foo',
          required: true,
          defaultValue: 'default value',
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields,
          customFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Missing required custom fields without default value configured: \\"missing field 1\\""`
      );
    });

    it('throws if required custom fields with default have null value', () => {
      const requestCustomFields: CaseCustomFields = [
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
      ];
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'missing field 2',
          required: true,
          defaultValue: true,
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields,
          customFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"null\\" supplied for the following required custom fields: \\"missing field 2\\""`
      );
    });

    it('throws if required custom fields without default have null value', () => {
      const requestCustomFields: CaseCustomFields = [
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
      ];
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'missing field 2',
          required: true,
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields,
          customFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"null\\" supplied for the following required custom fields: \\"missing field 2\\""`
      );
    });

    it('throws if configuration is missing and request has custom fields', () => {
      const requestCustomFields: CaseCustomFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          requestCustomFields,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });

    it('throws if all missing required custom fields do not have default values', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'missing field 1',
          required: true,
          defaultValue: null,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'foo',
          required: true,
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          customFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Missing required custom fields without default value configured: \\"missing field 1\\", \\"foo\\""`
      );
    });

    it('throws if some missing required custom fields do not have default values', () => {
      const customFieldsConfiguration: CustomFieldsConfiguration = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'missing field 1',
          required: true,
          defaultValue: 'default value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'foo',
          required: true,
        },
      ];
      expect(() =>
        validateRequiredCustomFields({
          customFieldsConfiguration,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Missing required custom fields without default value configured: \\"foo\\""`
      );
    });
  });

  describe('validateSearchCasesCustomFields', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const customFieldsConfiguration: CustomFieldsConfiguration = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        label: 'Text field',
        required: true,
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        label: 'Toggle field',
        required: true,
      },
    ];

    const customFields: CasesSearchRequest['customFields'] = {
      second_key: [true],
    };

    it('does not throw when custom fields are correct', () => {
      const newConfig = [
        ...customFieldsConfiguration,
        {
          key: 'third_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'Another toggle field',
          required: false,
        },
      ];

      const newCustomFields = { ...customFields, third_key: [false] };

      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration: newConfig,
          customFields: newCustomFields,
        })
      ).not.toThrow();
    });

    it('does not throw when multiple custom fields', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields,
        })
      ).not.toThrow();
    });

    it('does not throw when custom fields are empty', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields: {},
        })
      ).not.toThrow();
    });

    it('does not throw when custom field value is null', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields: { second_key: [null] },
        })
      ).not.toThrow();
    });

    it('throws error when custom fields configurations is empty', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration: [],
          customFields,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });

    it('throws error when custom fields key does not match with configuration', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields: { random_key: [true] },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid custom field key: random_key."`);
    });

    it('throws error when custom field is not filterable', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields: { first_key: ['hello'] },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Filtering by custom field of type text is not allowed."`
      );
    });

    it('throws error when custom field is searched with invalid value', () => {
      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields: { second_key: ['foobar', true, 1234] },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Unsupported filtering value for custom field of type toggle."`
      );
    });

    it('throws error when custom fields reach maximum', () => {
      let customFieldsMax = {};

      for (let i = 0; i <= MAX_CUSTOM_FIELDS_PER_CASE + 1; i++) {
        customFieldsMax = { ...customFieldsMax, [`test_key_${i}`]: [true] };
      }

      expect(() =>
        validateSearchCasesCustomFields({
          customFieldsConfiguration,
          customFields: customFieldsMax,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Maximum 10 customFields are allowed."`);
    });
  });
});
