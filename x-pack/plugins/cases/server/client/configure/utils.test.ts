/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fillMissingDefaultValues } from './utils';
import { CustomFieldTypes } from '../../../common/types/domain';
import type { CustomFieldsConfigurationRequest } from '../../../common/types/api';
import { DEFAULT_VALUE_TEXT, DEFAULT_VALUE_TOGGLE } from '../../common/constants';

describe('utils', () => {
  describe('fillMissingDefaultValues', () => {
    const customFields = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        label: 'label 1',
        required: true,
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        label: 'label 2',
        required: true,
      },
    ];

    it('adds missing default values correctly', () => {
      expect(
        fillMissingDefaultValues({
          customFields,
        })
      ).toEqual([
        {
          ...customFields[0],
          defaultValue: DEFAULT_VALUE_TEXT,
        },
        {
          ...customFields[1],
          defaultValue: DEFAULT_VALUE_TOGGLE,
        },
      ]);
    });

    it('adds missing default values if defaultValue: null', () => {
      expect(
        fillMissingDefaultValues({
          customFields: [
            {
              ...customFields[0],
              defaultValue: null,
            },
            {
              ...customFields[1],
              defaultValue: null,
            },
          ],
        })
      ).toEqual([
        {
          ...customFields[0],
          defaultValue: DEFAULT_VALUE_TEXT,
        },
        {
          ...customFields[1],
          defaultValue: DEFAULT_VALUE_TOGGLE,
        },
      ]);
    });

    it('does not add default values when they already exist', () => {
      const customFieldsWithDefaultValues = [
        {
          ...customFields[0],
          defaultValue: 'default value',
        },
        {
          ...customFields[1],
          defaultValue: true,
        },
      ] as CustomFieldsConfigurationRequest;

      expect(
        fillMissingDefaultValues({
          customFields: customFieldsWithDefaultValues,
        })
      ).toEqual(customFieldsWithDefaultValues);
    });

    it('only adds missing default values', () => {
      const additionalCustomFields = [
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'label 3',
          required: true,
          defaultValue: 'default value',
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'label 4',
          required: true,
          defaultValue: true,
        },
      ];
      expect(
        fillMissingDefaultValues({
          customFields: [...customFields, ...additionalCustomFields],
        })
      ).toEqual([
        {
          ...customFields[0],
          defaultValue: DEFAULT_VALUE_TEXT,
        },
        {
          ...customFields[1],
          defaultValue: DEFAULT_VALUE_TOGGLE,
        },
        ...additionalCustomFields,
      ]);
    });

    it('does not change optional custom fields', () => {
      const optionalCustomFields = [
        {
          key: 'third_key',
          type: CustomFieldTypes.TEXT,
          label: 'label 3',
          required: false,
        },
        {
          key: 'fourth_key',
          type: CustomFieldTypes.TOGGLE,
          label: 'label 4',
          required: false,
        },
      ];
      expect(
        fillMissingDefaultValues({
          customFields: [...customFields, ...optionalCustomFields],
        })
      ).toEqual([
        {
          ...customFields[0],
          defaultValue: DEFAULT_VALUE_TEXT,
        },
        {
          ...customFields[1],
          defaultValue: DEFAULT_VALUE_TOGGLE,
        },
        ...optionalCustomFields,
      ]);
    });
  });
});
