/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInitialCaseValue,
  trimUserFormData,
  getOwnerDefaultValue,
  createFormDeserializer,
  createFormSerializer,
} from './utils';
import { ConnectorTypes, CaseSeverity, CustomFieldTypes } from '../../../common/types/domain';
import { GENERAL_CASES_OWNER } from '../../../common';
import { casesConfigurationsMock } from '../../containers/configure/mock';

describe('utils', () => {
  describe('getInitialCaseValue', () => {
    it('returns expected initial values', () => {
      const params = {
        owner: 'foobar',
        connector: {
          id: 'foo',
          name: 'bar',
          type: ConnectorTypes.jira as const,
          fields: null,
        },
      };
      expect(getInitialCaseValue(params)).toEqual({
        assignees: [],
        category: undefined,
        customFields: [],
        description: '',
        settings: {
          syncAlerts: true,
        },
        severity: 'low',
        tags: [],
        title: '',
        ...params,
      });
    });

    it('returns none connector when none is specified', () => {
      expect(getInitialCaseValue({ owner: 'foobar' })).toEqual({
        assignees: [],
        category: undefined,
        connector: {
          fields: null,
          id: 'none',
          name: 'none',
          type: '.none',
        },
        customFields: [],
        description: '',
        owner: 'foobar',
        settings: {
          syncAlerts: true,
        },
        severity: 'low',
        tags: [],
        title: '',
      });
    });

    it('returns extra fields', () => {
      const extraFields = {
        owner: 'foobar',
        title: 'my title',
        assignees: [
          {
            uid: 'uid',
          },
        ],
        tags: ['my tag'],
        category: 'categorty',
        severity: CaseSeverity.HIGH as const,
        description: 'Cool description',
        settings: { syncAlerts: false },
        customFields: [{ key: 'key', type: CustomFieldTypes.TEXT as const, value: 'text' }],
      };

      expect(getInitialCaseValue(extraFields)).toEqual({
        connector: {
          fields: null,
          id: 'none',
          name: 'none',
          type: '.none',
        },
        ...extraFields,
      });
    });
  });

  describe('trimUserFormData', () => {
    it('trims applicable fields in the user form data', () => {
      const userFormData = {
        title: '  title  ',
        description: '  description ',
        category: '  category  ',
        tags: ['  tag 1  ', '  tag 2  '],
      };

      expect(trimUserFormData(userFormData)).toEqual({
        title: userFormData.title.trim(),
        description: userFormData.description.trim(),
        category: userFormData.category.trim(),
        tags: ['tag 1', 'tag 2'],
      });
    });

    it('ignores category and tags if they are missing', () => {
      const userFormData = {
        title: '  title  ',
        description: '  description ',
        tags: [],
      };

      expect(trimUserFormData(userFormData)).toEqual({
        title: userFormData.title.trim(),
        description: userFormData.description.trim(),
        tags: [],
      });
    });
  });

  describe('getOwnerDefaultValue', () => {
    it('returns the general cases owner if it exists', () => {
      expect(getOwnerDefaultValue(['foobar', GENERAL_CASES_OWNER])).toEqual(GENERAL_CASES_OWNER);
    });

    it('returns the first available owner if the general cases owner is not available', () => {
      expect(getOwnerDefaultValue(['foo', 'bar'])).toEqual('foo');
    });

    it('returns the general cases owner if no owner is available', () => {
      expect(getOwnerDefaultValue([])).toEqual(GENERAL_CASES_OWNER);
    });
  });

  describe('createFormSerializer', () => {
    const dataToSerialize = {
      title: 'title',
      description: 'description',
      tags: [],
      connectorId: '',
      fields: { incidentTypes: null, severityCode: null },
      customFields: {},
      syncAlerts: false,
    };
    const serializedFormData = {
      title: 'title',
      description: 'description',
      customFields: [],
      settings: {
        syncAlerts: false,
      },
      tags: [],
      connector: {
        fields: null,
        id: 'none',
        name: 'none',
        type: '.none',
      },
      owner: casesConfigurationsMock.owner,
    };

    it('returns empty values with owner and connector from configuration when data is empty', () => {
      // @ts-ignore: this is what we are trying to test
      expect(createFormSerializer([], casesConfigurationsMock, {})).toEqual({
        assignees: [],
        category: undefined,
        customFields: [],
        description: '',
        settings: {
          syncAlerts: true,
        },
        severity: 'low',
        tags: [],
        title: '',
        connector: casesConfigurationsMock.connector,
        owner: casesConfigurationsMock.owner,
      });
    });

    it('normalizes action connectors', () => {
      expect(
        createFormSerializer(
          [
            {
              id: 'test',
              actionTypeId: '.test',
              name: 'My connector',
              isDeprecated: false,
              isPreconfigured: false,
              config: { foo: 'bar' },
              isMissingSecrets: false,
              isSystemAction: false,
            },
          ],
          casesConfigurationsMock,
          {
            ...dataToSerialize,
            connectorId: 'test',
            fields: {
              issueType: '1',
              priority: 'test',
              parent: null,
            },
          }
        )
      ).toEqual({
        ...serializedFormData,
        connector: {
          id: 'test',
          name: 'My connector',
          type: '.test',
          fields: {
            issueType: '1',
            priority: 'test',
            parent: null,
          },
        },
      });
    });

    it('transforms custom fields', () => {
      expect(
        createFormSerializer([], casesConfigurationsMock, {
          ...dataToSerialize,
          customFields: {
            test_key_1: 'first value',
            test_key_2: true,
            test_key_3: 'second value',
          },
        })
      ).toEqual({
        ...serializedFormData,
        customFields: [
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
        ],
      });
    });

    it('trims form data', () => {
      const untrimmedData = {
        title: '  title  ',
        description: '  description ',
        category: '  category  ',
        tags: ['  tag 1  ', '  tag 2  '],
      };

      expect(
        // @ts-ignore: expected incomplete form data
        createFormSerializer([], casesConfigurationsMock, { ...dataToSerialize, ...untrimmedData })
      ).toEqual({
        ...serializedFormData,
        title: untrimmedData.title.trim(),
        description: untrimmedData.description.trim(),
        category: untrimmedData.category.trim(),
        tags: ['tag 1', 'tag 2'],
      });
    });
  });

  describe('createFormDeserializer', () => {
    it('deserializes data as expected', () => {
      expect(
        createFormDeserializer({
          title: 'title',
          description: 'description',
          settings: {
            syncAlerts: false,
          },
          tags: [],
          connector: {
            id: 'foobar',
            name: 'none',
            type: ConnectorTypes.jira as const,
            fields: {
              issueType: '1',
              priority: 'test',
              parent: null,
            },
          },
          owner: casesConfigurationsMock.owner,
          customFields: [],
        })
      ).toEqual({
        title: 'title',
        description: 'description',
        syncAlerts: false,
        tags: [],
        owner: casesConfigurationsMock.owner,
        connectorId: 'foobar',
        fields: {
          issueType: '1',
          priority: 'test',
          parent: null,
        },
        customFields: {},
      });
    });

    it('deserializes customFields as expected', () => {
      expect(
        createFormDeserializer({
          title: 'title',
          description: 'description',
          settings: {
            syncAlerts: false,
          },
          tags: [],
          connector: {
            id: 'foobar',
            name: 'none',
            type: ConnectorTypes.jira as const,
            fields: {
              issueType: '1',
              priority: 'test',
              parent: null,
            },
          },
          owner: casesConfigurationsMock.owner,
          customFields: [
            {
              key: 'test_key_1',
              type: CustomFieldTypes.TEXT,
              value: 'first value',
            },
            {
              key: 'test_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'test_key_3',
              type: CustomFieldTypes.TEXT,
              value: 'second value',
            },
          ],
        })
      ).toEqual({
        title: 'title',
        description: 'description',
        syncAlerts: false,
        tags: [],
        owner: casesConfigurationsMock.owner,
        connectorId: 'foobar',
        fields: {
          issueType: '1',
          priority: 'test',
          parent: null,
        },
        customFields: {
          test_key_1: 'first value',
          test_key_2: true,
          test_key_3: 'second value',
        },
      });
    });
  });
});
