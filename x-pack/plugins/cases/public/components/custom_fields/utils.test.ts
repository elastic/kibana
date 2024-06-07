/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customFieldSerializer, transformCustomFieldsData } from './utils';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import { customFieldsConfigurationMock } from '../../containers/mock';

describe('utils ', () => {
  describe('customFieldSerializer ', () => {
    it('serializes the data correctly if the default value is a normal string', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.TEXT,
        required: true,
        defaultValue: 'foobar',
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "defaultValue": "foobar",
          "key": "my_test_key",
          "required": true,
          "type": "text",
        }
      `);
    });

    it('serializes the data correctly if the default value is undefined', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.TEXT,
        required: true,
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "key": "my_test_key",
          "required": true,
          "type": "text",
        }
      `);
    });

    it('serializes the data correctly if the default value is null', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.TEXT,
        required: true,
        defaultValue: null,
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "defaultValue": null,
          "key": "my_test_key",
          "required": true,
          "type": "text",
        }
      `);
    });

    it('serializes the data correctly if the default value is an empty string', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.TEXT,
        required: true,
        defaultValue: '   ',
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "key": "my_test_key",
          "required": true,
          "type": "text",
        }
      `);
    });

    it('serializes the data correctly if the default value is false', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.TOGGLE,
        required: true,
        defaultValue: false,
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "defaultValue": false,
          "key": "my_test_key",
          "required": true,
          "type": "toggle",
        }
      `);
    });
  });

  describe('transformCustomFieldsData', () => {
    it('transforms customFields correctly', () => {
      const customFields = {
        test_key_1: 'first value',
        test_key_2: true,
        test_key_3: 'second value',
      };

      expect(transformCustomFieldsData(customFields, customFieldsConfigurationMock)).toEqual([
        {
          key: 'test_key_1',
          type: 'text',
          value: 'first value',
        },
        {
          key: 'test_key_2',
          type: 'toggle',
          value: true,
        },
        {
          key: 'test_key_3',
          type: 'text',
          value: 'second value',
        },
      ]);
    });

    it('returns empty array when custom fields are empty', () => {
      expect(transformCustomFieldsData({}, customFieldsConfigurationMock)).toEqual([]);
    });

    it('returns empty array when not custom fields in the configuration', () => {
      const customFields = {
        test_key_1: 'first value',
        test_key_2: true,
        test_key_3: 'second value',
      };

      expect(transformCustomFieldsData(customFields, [])).toEqual([]);
    });

    it('returns empty array when custom fields do not match with configuration', () => {
      const customFields = {
        random_key: 'first value',
      };

      expect(transformCustomFieldsData(customFields, customFieldsConfigurationMock)).toEqual([]);
    });
  });
});
