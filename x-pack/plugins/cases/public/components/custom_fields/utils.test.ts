/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addOrReplaceCustomField, customFieldSerializer } from './utils';
import { customFieldsConfigurationMock, customFieldsMock } from '../../containers/mock';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import type { CaseUICustomField } from '../../../common/ui';

describe('utils ', () => {
  describe('addOrReplaceCustomField ', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('adds new custom field correctly', async () => {
      const fieldToAdd: CaseUICustomField = {
        key: 'my_test_key',
        type: CustomFieldTypes.TEXT,
        value: 'my_test_value',
      };
      const res = addOrReplaceCustomField(customFieldsMock, fieldToAdd);
      expect(res).toMatchInlineSnapshot(
        [...customFieldsMock, fieldToAdd],
        `
              Array [
                Object {
                  "key": "test_key_1",
                  "type": "text",
                  "value": "My text test value 1",
                },
                Object {
                  "key": "test_key_2",
                  "type": "toggle",
                  "value": true,
                },
                Object {
                  "key": "test_key_3",
                  "type": "text",
                  "value": null,
                },
                Object {
                  "key": "test_key_4",
                  "type": "toggle",
                  "value": null,
                },
                Object {
                  "key": "my_test_key",
                  "type": "text",
                  "value": "my_test_value",
                },
              ]
          `
      );
    });

    it('updates existing custom field correctly', async () => {
      const fieldToUpdate = {
        ...customFieldsMock[0],
        field: { value: ['My text test value 1!!!'] },
      };

      const res = addOrReplaceCustomField(customFieldsMock, fieldToUpdate as CaseUICustomField);
      expect(res).toMatchInlineSnapshot(
        [
          { ...fieldToUpdate },
          { ...customFieldsMock[1] },
          { ...customFieldsMock[2] },
          { ...customFieldsMock[3] },
        ],
        `
              Array [
                Object {
                  "field": Object {
                    "value": Array [
                      "My text test value 1!!!",
                    ],
                  },
                  "key": "test_key_1",
                  "type": "text",
                  "value": "My text test value 1",
                },
                Object {
                  "key": "test_key_2",
                  "type": "toggle",
                  "value": true,
                },
                Object {
                  "key": "test_key_3",
                  "type": "text",
                  "value": null,
                },
                Object {
                  "key": "test_key_4",
                  "type": "toggle",
                  "value": null,
                },
              ]
          `
      );
    });

    it('adds new custom field configuration correctly', async () => {
      const fieldToAdd = {
        key: 'my_test_key',
        type: CustomFieldTypes.TEXT,
        label: 'my_test_label',
        required: true,
      };
      const res = addOrReplaceCustomField(customFieldsConfigurationMock, fieldToAdd);
      expect(res).toMatchInlineSnapshot(
        [...customFieldsConfigurationMock, fieldToAdd],
        `
              Array [
                Object {
                  "defaultValue": "My default value",
                  "key": "test_key_1",
                  "label": "My test label 1",
                  "required": true,
                  "type": "text",
                },
                Object {
                  "defaultValue": true,
                  "key": "test_key_2",
                  "label": "My test label 2",
                  "required": true,
                  "type": "toggle",
                },
                Object {
                  "key": "test_key_3",
                  "label": "My test label 3",
                  "required": false,
                  "type": "text",
                },
                Object {
                  "key": "test_key_4",
                  "label": "My test label 4",
                  "required": false,
                  "type": "toggle",
                },
                Object {
                  "key": "my_test_key",
                  "label": "my_test_label",
                  "required": true,
                  "type": "text",
                },
              ]
          `
      );
    });

    it('updates existing custom field config correctly', async () => {
      const fieldToUpdate = {
        ...customFieldsConfigurationMock[0],
        label: `${customFieldsConfigurationMock[0].label}!!!`,
      };

      const res = addOrReplaceCustomField(customFieldsConfigurationMock, fieldToUpdate);
      expect(res).toMatchInlineSnapshot(
        [
          { ...fieldToUpdate },
          { ...customFieldsConfigurationMock[1] },
          { ...customFieldsConfigurationMock[2] },
          { ...customFieldsConfigurationMock[3] },
        ],
        `
              Array [
                Object {
                  "defaultValue": "My default value",
                  "key": "test_key_1",
                  "label": "My test label 1!!!",
                  "required": true,
                  "type": "text",
                },
                Object {
                  "defaultValue": true,
                  "key": "test_key_2",
                  "label": "My test label 2",
                  "required": true,
                  "type": "toggle",
                },
                Object {
                  "key": "test_key_3",
                  "label": "My test label 3",
                  "required": false,
                  "type": "text",
                },
                Object {
                  "key": "test_key_4",
                  "label": "My test label 4",
                  "required": false,
                  "type": "toggle",
                },
              ]
          `
      );
    });
  });

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
});
