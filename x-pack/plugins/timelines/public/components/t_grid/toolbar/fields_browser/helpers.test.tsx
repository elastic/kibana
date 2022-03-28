/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockBrowserFields } from '../../../../mock';

import {
  categoryHasFields,
  getFieldCount,
  filterBrowserFieldsByFieldName,
  filterSelectedBrowserFields,
} from './helpers';
import { BrowserFields } from '../../../../../common/search_strategy';
import { ColumnHeaderOptions } from '../../../../../common';
import largeBrowserFields from './large_browser_fields_for_testing_filter_browser_fields_by_field_name.json';

describe('helpers', () => {
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

    test("it returns the expected fields/categories when the substring is '.' and the browser fields are large", () => {
      expect(
        filterBrowserFieldsByFieldName({
          browserFields: largeBrowserFields,
          substring: '.',
        })
      ).toMatchSnapshot();
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
        base: {
          fields: {
            _id: {
              category: 'base',
              description: 'Each document has an _id that uniquely identifies it',
              example: 'Y-6TfmcB0WOhS6qyMv3s',
              name: '_id',
              type: 'string',
              searchable: true,
              aggregatable: false,
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
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

  describe('filterSelectedBrowserFields', () => {
    const columnHeaders = [
      { id: 'agent.ephemeral_id' },
      { id: 'agent.id' },
      { id: 'container.id' },
    ] as ColumnHeaderOptions[];

    test('it returns an empty collection when browserFields is empty', () => {
      expect(filterSelectedBrowserFields({ browserFields: {}, columnHeaders: [] })).toEqual({});
    });

    test('it returns an empty collection when browserFields is empty and columnHeaders is non empty', () => {
      expect(filterSelectedBrowserFields({ browserFields: {}, columnHeaders })).toEqual({});
    });

    test('it returns an empty collection when browserFields is NOT empty and columnHeaders is empty', () => {
      expect(
        filterSelectedBrowserFields({
          browserFields: mockBrowserFields,
          columnHeaders: [],
        })
      ).toEqual({});
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
        filterSelectedBrowserFields({
          browserFields: mockBrowserFields,
          columnHeaders,
        })
      ).toEqual(filtered);
    });
  });
});
