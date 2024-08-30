/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, ConnectorTypes } from '../../../common';
import { CustomFieldTypes } from '../../../common/types/domain';
import { casesConfigurationsMock } from '../../containers/configure/mock';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import type { CaseUI } from '../../containers/types';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import {
  convertTemplateCustomFields,
  removeEmptyFields,
  templateDeserializer,
  templateSerializer,
} from './utils';

describe('utils', () => {
  describe('getTemplateSerializedData', () => {
    it('serializes empty fields correctly', () => {
      const res = templateSerializer(connectorsMock, casesConfigurationsMock, {
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

      expect(res).toEqual({
        caseFields: {
          connector: {
            fields: null,
            id: 'none',
            name: 'none',
            type: '.none',
          },
          customFields: [],
          settings: {
            syncAlerts: false,
          },
        },
        description: undefined,
        key: '',
        name: '',
        tags: [],
      });
    });

    it('serializes connectors fields correctly', () => {
      const res = templateSerializer(connectorsMock, casesConfigurationsMock, {
        key: '',
        name: '',
        templateDescription: '',
        fields: null,
      });

      expect(res).toEqual({
        caseFields: {
          connector: {
            fields: null,
            id: 'none',
            name: 'none',
            type: '.none',
          },
          customFields: [],
          settings: {
            syncAlerts: false,
          },
        },
        description: undefined,
        key: '',
        name: '',
        tags: [],
      });
    });

    it('serializes non empty fields correctly', () => {
      const res = templateSerializer(connectorsMock, casesConfigurationsMock, {
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
        templateTags: ['sample'],
        category: 'new',
      });

      expect(res).toEqual({
        caseFields: {
          category: 'new',
          connector: {
            fields: null,
            id: 'none',
            name: 'none',
            type: '.none',
          },
          customFields: [],
          settings: {
            syncAlerts: false,
          },
        },
        description: 'description 1',
        key: 'key_1',
        name: 'template 1',
        tags: ['sample'],
      });
    });

    it('serializes custom fields correctly', () => {
      const res = templateSerializer(connectorsMock, casesConfigurationsMock, {
        key: 'key_1',
        name: 'template 1',
        templateDescription: '',
        customFields: {
          test_key_1: 'foobar',
          test_key_3: '',
          test_key_2: true,
        },
      });

      expect(res).toEqual({
        caseFields: {
          connector: {
            fields: null,
            id: 'none',
            name: 'none',
            type: '.none',
          },
          customFields: [
            { key: 'test_key_1', type: 'text', value: 'foobar' },
            { key: 'test_key_3', type: 'text', value: null },
            { key: 'test_key_2', type: 'toggle', value: true },
          ],
          settings: {
            syncAlerts: false,
          },
        },
        description: undefined,
        key: 'key_1',
        name: 'template 1',
        tags: [],
      });
    });

    it('serializes connector fields correctly', () => {
      const res = templateSerializer(connectorsMock, casesConfigurationsMock, {
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
        caseFields: {
          connector: {
            fields: null,
            id: 'none',
            name: 'none',
            type: '.none',
          },
          customFields: [],
          settings: {
            syncAlerts: false,
          },
        },
        description: undefined,
        key: 'key_1',
        name: 'template 1',
        tags: [],
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
