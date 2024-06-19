/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUI } from '../../../common';
import { CaseSeverity } from '../../../common';
import {
  convertTemplateCustomFields,
  getTemplateSerializedData,
  removeEmptyFields,
  templateDeserializer,
} from './utils';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';

describe('utils', () => {
  describe('getTemplateSerializedData', () => {
    it('serializes empty fields correctly', () => {
      const res = getTemplateSerializedData({
        key: '',
        name: '',
        templateDescription: '',
        title: '',
        description: '',
        templateTags: [],
        tags: [],
        fields: null,
        category: null,
      });

      expect(res).toEqual({ fields: null });
    });

    it('serializes connectors fields correctly', () => {
      const res = getTemplateSerializedData({
        key: '',
        name: '',
        templateDescription: '',
        fields: null,
      });

      expect(res).toEqual({
        fields: null,
      });
    });

    it('serializes non empty fields correctly', () => {
      const res = getTemplateSerializedData({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
        templateTags: ['sample'],
        category: 'new',
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
        category: 'new',
        templateTags: ['sample'],
        fields: null,
      });
    });

    it('serializes custom fields correctly', () => {
      const res = getTemplateSerializedData({
        key: 'key_1',
        name: 'template 1',
        templateDescription: '',
        customFields: {
          custom_field_1: 'foobar',
          custom_fields_2: '',
          custom_field_3: true,
        },
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        customFields: {
          custom_field_1: 'foobar',
          custom_field_3: true,
        },
        fields: null,
      });
    });

    it('serializes connector fields correctly', () => {
      const res = getTemplateSerializedData({
        key: 'key_1',
        name: 'template 1',
        templateDescription: '',
        fields: {
          impact: 'high',
          severity: 'low',
          category: null,
          urgency: null,
          subcategory: null,
        },
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        fields: {
          impact: 'high',
          severity: 'low',
          category: null,
          urgency: null,
          subcategory: null,
        },
      });
    });
  });

  describe('removeEmptyFields', () => {
    it('removes empty fields', () => {
      const res = removeEmptyFields({
        key: '',
        name: '',
        templateDescription: '',
        title: '',
        description: '',
        templateTags: [],
        tags: [],
        fields: null,
      });

      expect(res).toEqual({});
    });

    it('does not remove not empty fields', () => {
      const res = removeEmptyFields({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
      });
    });
  });

  describe('templateDeserializer', () => {
    it('deserialzies initial data correctly', () => {
      const res = templateDeserializer({ key: 'temlate_1', name: 'Template 1', caseFields: null });

      expect(res).toEqual({
        key: 'temlate_1',
        name: 'Template 1',
        templateDescription: '',
        templateTags: [],
        tags: [],
        connectorId: 'none',
        customFields: {},
        fields: null,
      });
    });

    it('deserialzies template data correctly', () => {
      const res = templateDeserializer({
        key: 'temlate_1',
        name: 'Template 1',
        description: 'This is first template',
        tags: ['t1', 't2'],
        caseFields: null,
      });

      expect(res).toEqual({
        key: 'temlate_1',
        name: 'Template 1',
        templateDescription: 'This is first template',
        templateTags: ['t1', 't2'],
        tags: [],
        connectorId: 'none',
        customFields: {},
        fields: null,
      });
    });

    it('deserialzies case fields data correctly', () => {
      const res = templateDeserializer({
        key: 'temlate_1',
        name: 'Template 1',
        caseFields: {
          title: 'Case title',
          description: 'This is test case',
          category: null,
          tags: ['foo', 'bar'],
          severity: CaseSeverity.LOW,
          assignees: [{ uid: userProfiles[0].uid }],
        },
      });

      expect(res).toEqual({
        key: 'temlate_1',
        name: 'Template 1',
        templateDescription: '',
        templateTags: [],
        title: 'Case title',
        description: 'This is test case',
        category: null,
        tags: ['foo', 'bar'],
        severity: CaseSeverity.LOW,
        assignees: [{ uid: userProfiles[0].uid }],
        connectorId: 'none',
        customFields: {},
        fields: null,
      });
    });

    it('deserialzies custom fields data correctly', () => {
      const res = templateDeserializer({
        key: 'temlate_1',
        name: 'Template 1',
        caseFields: {
          customFields: [
            {
              key: customFieldsConfigurationMock[0].key,
              type: CustomFieldTypes.TEXT,
              value: 'this is first custom field value',
            },
            {
              key: customFieldsConfigurationMock[1].key,
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        },
      });

      expect(res).toEqual({
        key: 'temlate_1',
        name: 'Template 1',
        templateDescription: '',
        templateTags: [],
        tags: [],
        connectorId: 'none',
        customFields: {
          [customFieldsConfigurationMock[0].key]: 'this is first custom field value',
          [customFieldsConfigurationMock[1].key]: true,
        },
        fields: null,
      });
    });

    it('deserialzies connector data correctly', () => {
      const res = templateDeserializer({
        key: 'temlate_1',
        name: 'Template 1',
        caseFields: {
          connector: {
            id: 'servicenow-1',
            name: 'My SN connector',
            type: ConnectorTypes.serviceNowITSM,
            fields: {
              category: 'software',
              urgency: '1',
              severity: null,
              impact: null,
              subcategory: null,
            },
          },
        },
      });

      expect(res).toEqual({
        key: 'temlate_1',
        name: 'Template 1',
        templateDescription: '',
        templateTags: [],
        tags: [],
        connectorId: 'servicenow-1',
        customFields: {},
        fields: {
          category: 'software',
          impact: undefined,
          severity: undefined,
          subcategory: undefined,
          urgency: '1',
        },
      });
    });
  });

  describe('convertTemplateCustomFields', () => {
    it('converts data correctly', () => {
      const data = [
        {
          key: customFieldsConfigurationMock[0].key,
          type: CustomFieldTypes.TEXT,
          value: 'this is first custom field value',
        },
        {
          key: customFieldsConfigurationMock[1].key,
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
      ] as CaseUI['customFields'];

      const res = convertTemplateCustomFields(data);

      expect(res).toEqual({
        [customFieldsConfigurationMock[0].key]: 'this is first custom field value',
        [customFieldsConfigurationMock[1].key]: true,
      });
    });

    it('returns null when customFields empty', () => {
      const res = convertTemplateCustomFields([]);

      expect(res).toEqual(null);
    });

    it('returns null when customFields undefined', () => {
      const res = convertTemplateCustomFields(undefined);

      expect(res).toEqual(null);
    });
  });
});
