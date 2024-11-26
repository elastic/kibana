/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customFieldSerializer } from './utils';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';

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

    it('serializes the data correctly if the default value is integer number', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.NUMBER,
        required: true,
        defaultValue: 1,
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "defaultValue": 1,
          "key": "my_test_key",
          "required": true,
          "type": "number",
        }
      `);
    });

    it('serializes the data correctly if the default value is float number', async () => {
      const customField = {
        key: 'my_test_key',
        type: CustomFieldTypes.NUMBER,
        required: true,
        defaultValue: 1.5,
      } as CustomFieldConfiguration;

      expect(customFieldSerializer(customField)).toMatchInlineSnapshot(`
        Object {
          "key": "my_test_key",
          "required": true,
          "type": "number",
        }
      `);
    });
  });
});
