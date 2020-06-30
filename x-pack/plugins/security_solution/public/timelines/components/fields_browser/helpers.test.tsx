/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockBrowserFields } from '../../../common/containers/source/mock';

import {
  categoryHasFields,
  createVirtualCategory,
  getCategoryPaneCategoryClassName,
  getFieldBrowserCategoryTitleClassName,
  getFieldBrowserSearchInputClassName,
  getFieldCount,
  filterBrowserFieldsByFieldName,
} from './helpers';
import { BrowserFields } from '../../../common/containers/source';

const timelineId = 'test';

describe('helpers', () => {
  describe('getCategoryPaneCategoryClassName', () => {
    test('it returns the expected class name', () => {
      const categoryId = 'auditd';

      expect(getCategoryPaneCategoryClassName({ categoryId, timelineId })).toEqual(
        'field-browser-category-pane-auditd-test'
      );
    });
  });

  describe('getFieldBrowserCategoryTitleClassName', () => {
    test('it returns the expected class name', () => {
      const categoryId = 'auditd';

      expect(getFieldBrowserCategoryTitleClassName({ categoryId, timelineId })).toEqual(
        'field-browser-category-title-auditd-test'
      );
    });
  });

  describe('getFieldBrowserSearchInputClassName', () => {
    test('it returns the expected class name', () => {
      expect(getFieldBrowserSearchInputClassName(timelineId)).toEqual(
        'field-browser-search-input-test'
      );
    });
  });

  describe('categoryHasFields', () => {
    test('it returns false if the category fields property is undefined', () => {
      expect(categoryHasFields({})).toBe(false);
    });

    test('it returns false if the category fields property is empty', () => {
      expect(categoryHasFields({ fields: {} })).toBe(false);
    });

    test('it returns true if the category has one field', () => {
      expect(
        categoryHasFields({
          fields: {
            'auditd.data.a0': {
              aggregatable: true,
              category: 'auditd',
              description: null,
              example: null,
              format: '',
              indexes: ['auditbeat'],
              name: 'auditd.data.a0',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toBe(true);
    });

    test('it returns true if the category has multiple fields', () => {
      expect(
        categoryHasFields({
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.hostname': {
              aggregatable: true,
              category: 'agent',
              description: null,
              example: null,
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.hostname',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toBe(true);
    });
  });

  describe('getFieldCount', () => {
    test('it returns 0 if the category fields property is undefined', () => {
      expect(getFieldCount({})).toEqual(0);
    });

    test('it returns 0 if the category fields property is empty', () => {
      expect(getFieldCount({ fields: {} })).toEqual(0);
    });

    test('it returns 1 if the category has one field', () => {
      expect(
        getFieldCount({
          fields: {
            'auditd.data.a0': {
              aggregatable: true,
              category: 'auditd',
              description: null,
              example: null,
              format: '',
              indexes: ['auditbeat'],
              name: 'auditd.data.a0',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toEqual(1);
    });

    test('it returns the correct count when category has multiple fields', () => {
      expect(
        getFieldCount({
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.hostname': {
              aggregatable: true,
              category: 'agent',
              description: null,
              example: null,
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.hostname',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toEqual(2);
    });
  });

  describe('filterBrowserFieldsByFieldName', () => {
    test('it returns an empty collection when browserFields is empty', () => {
      expect(filterBrowserFieldsByFieldName({ browserFields: {}, substring: '' })).toEqual({});
    });

    test('it returns an empty collection when browserFields is empty and substring is non empty', () => {
      expect(
        filterBrowserFieldsByFieldName({ browserFields: {}, substring: 'nothing to match' })
      ).toEqual({});
    });

    test('it returns an empty collection when browserFields is NOT empty and substring does not match any fields', () => {
      expect(
        filterBrowserFieldsByFieldName({
          browserFields: mockBrowserFields,
          substring: 'nothing to match',
        })
      ).toEqual({});
    });

    test('it returns the original collection when browserFields is NOT empty and substring is empty', () => {
      expect(
        filterBrowserFieldsByFieldName({
          browserFields: mockBrowserFields,
          substring: '',
        })
      ).toEqual(mockBrowserFields);
    });

    test('it returns (only) non-empty categories, where each category contains only the fields matching the substring', () => {
      const filtered: BrowserFields = {
        agent: {
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
              example: '8a4f500d',
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.id',
              searchable: true,
              type: 'string',
            },
          },
        },
        cloud: {
          fields: {
            'cloud.account.id': {
              aggregatable: true,
              category: 'cloud',
              description:
                'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
              example: '666777888999',
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'cloud.account.id',
              searchable: true,
              type: 'string',
            },
          },
        },
        container: {
          fields: {
            'container.id': {
              aggregatable: true,
              category: 'container',
              description: 'Unique container id.',
              example: null,
              format: '',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'container.id',
              searchable: true,
              type: 'string',
            },
          },
        },
      };

      expect(
        filterBrowserFieldsByFieldName({
          browserFields: mockBrowserFields,
          substring: 'id',
        })
      ).toEqual(filtered);
    });
  });

  describe('createVirtualCategory', () => {
    test('it combines the specified fields into a virtual category when the input ONLY contains field names that contain dots (e.g. agent.hostname)', () => {
      const expectedMatchingFields = {
        fields: {
          'agent.hostname': {
            aggregatable: true,
            category: 'agent',
            description: null,
            example: null,
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'agent.hostname',
            searchable: true,
            type: 'string',
          },
          'client.domain': {
            aggregatable: true,
            category: 'client',
            description: 'Client domain.',
            example: null,
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'client.domain',
            searchable: true,
            type: 'string',
          },
          'client.geo.country_iso_code': {
            aggregatable: true,
            category: 'client',
            description: 'Country ISO code.',
            example: 'CA',
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'client.geo.country_iso_code',
            searchable: true,
            type: 'string',
          },
        },
      };

      const fieldIds = ['agent.hostname', 'client.domain', 'client.geo.country_iso_code'];

      expect(
        createVirtualCategory({
          browserFields: mockBrowserFields,
          fieldIds,
        })
      ).toEqual(expectedMatchingFields);
    });

    test('it combines the specified fields into a virtual category when the input includes field names from the base category that do NOT contain dots (e.g. @timestamp)', () => {
      const expectedMatchingFields = {
        fields: {
          'agent.hostname': {
            aggregatable: true,
            category: 'agent',
            description: null,
            example: null,
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'agent.hostname',
            searchable: true,
            type: 'string',
          },
          '@timestamp': {
            aggregatable: true,
            category: 'base',
            description:
              'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
            example: '2016-05-23T08:05:34.853Z',
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: '@timestamp',
            searchable: true,
            type: 'date',
          },
          'client.domain': {
            aggregatable: true,
            category: 'client',
            description: 'Client domain.',
            example: null,
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'client.domain',
            searchable: true,
            type: 'string',
          },
        },
      };

      const fieldIds = ['agent.hostname', '@timestamp', 'client.domain'];

      expect(
        createVirtualCategory({
          browserFields: mockBrowserFields,
          fieldIds,
        })
      ).toEqual(expectedMatchingFields);
    });
  });
});
