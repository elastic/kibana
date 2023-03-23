/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { EnterpriseSearchEngineDetails, SchemaField } from '../../../common/types/engines';

import { fetchEngineFieldCapabilities, parseFieldsCapabilities } from './field_capabilities';

describe('engines field_capabilities', () => {
  const mockClient = {
    asCurrentUser: {
      fieldCaps: jest.fn(),
    },
    asInternalUser: {},
  };
  const mockEngine: EnterpriseSearchEngineDetails = {
    indices: [],
    name: 'unit-test-engine',
    updated_at_millis: 2202018295,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchEngineFieldCapabilities', () => {
    it('gets engine alias field capabilities', async () => {
      const fieldCapsResponse: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001'],
      };

      mockClient.asCurrentUser.fieldCaps.mockResolvedValueOnce(fieldCapsResponse);
      await expect(
        fetchEngineFieldCapabilities(mockClient as unknown as IScopedClusterClient, mockEngine)
      ).resolves.toEqual({
        field_capabilities: fieldCapsResponse,
        fields: [
          {
            fields: [],
            indices: [
              {
                name: 'index-001',
                type: 'text',
              },
            ],
            name: 'body',
            type: 'text',
          },
        ],
        name: mockEngine.name,
        updated_at_millis: mockEngine.updated_at_millis,
      });

      expect(mockClient.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(1);
      expect(mockClient.asCurrentUser.fieldCaps).toHaveBeenCalledWith({
        fields: '*',
        include_unmapped: true,
        index: 'search-engine-unit-test-engine',
      });
    });
  });

  describe('parseFieldsCapabilities', () => {
    it('parse field capabilities to a list of fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          views: {
            number: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'number',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [],
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          name: 'body',
          type: 'text',
        },
        {
          fields: [],
          indices: [
            {
              name: 'index-001',
              type: 'number',
            },
          ],
          name: 'views',
          type: 'number',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles multi-fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'body.keyword': {
            keyword: {
              aggregatable: true,
              metadata_field: false,
              searchable: true,
              type: 'keyword',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'keyword',
                },
              ],
              name: 'keyword',
              type: 'keyword',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          name: 'body',
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles object fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            object: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'object',
            },
          ],
          name: 'name',
          type: 'object',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles nested fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            nested: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'nested',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'nested',
            },
          ],
          name: 'name',
          type: 'nested',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [],
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
          ],
          name: 'body',
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts in top-level fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            object: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'text',
                },
                {
                  name: 'index-001',
                  type: 'unmapped',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'text',
                },
                {
                  name: 'index-001',
                  type: 'unmapped',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-002',
              type: 'object',
            },
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          name: 'name',
          type: 'conflict',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts of more than two indices', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            keyword: {
              aggregatable: false,
              indices: ['index-003'],
              metadata_field: false,
              searchable: true,
              type: 'keyword',
            },
            object: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              indices: ['index-002', 'index-003'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002', 'index-003'],
      };

      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'text',
                },
                {
                  name: 'index-003',
                  type: 'text',
                },
                {
                  name: 'index-001',
                  type: 'unmapped',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'text',
                },
                {
                  name: 'index-001',
                  type: 'unmapped',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-003',
              type: 'keyword',
            },
            {
              name: 'index-002',
              type: 'object',
            },
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          name: 'name',
          type: 'conflict',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts  & unmapped fields together', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              indices: ['index-003'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001', 'index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          name: {
            object: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-003'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001', 'index-003'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001', 'index-003'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002', 'index-003'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [],
          indices: [
            {
              name: 'index-003',
              type: 'text',
            },
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
          ],
          name: 'body',
          type: 'text',
        },
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'text',
                },
                {
                  name: 'index-001',
                  type: 'unmapped',
                },
                {
                  name: 'index-003',
                  type: 'unmapped',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'text',
                },
                {
                  name: 'index-001',
                  type: 'unmapped',
                },
                {
                  name: 'index-003',
                  type: 'unmapped',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-002',
              type: 'object',
            },
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-003',
              type: 'unmapped',
            },
          ],
          name: 'name',
          type: 'conflict',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped sub-fields in object fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            object: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
                {
                  name: 'index-002',
                  type: 'text',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
                {
                  name: 'index-002',
                  type: 'unmapped',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'object',
            },
            {
              name: 'index-002',
              type: 'object',
            },
          ],
          name: 'name',
          type: 'object',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped sub-fields in  nested fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            nested: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'nested',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
                {
                  name: 'index-002',
                  type: 'text',
                },
              ],
              name: 'first',
              type: 'text',
            },
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'text',
                },
                {
                  name: 'index-002',
                  type: 'unmapped',
                },
              ],
              name: 'last',
              type: 'text',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'nested',
            },
            {
              name: 'index-002',
              type: 'nested',
            },
          ],
          name: 'name',
          type: 'nested',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped multi fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'body.keyword': {
            keyword: {
              aggregatable: true,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'keyword',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-001',
                  type: 'keyword',
                },
                {
                  name: 'index-002',
                  type: 'unmapped',
                },
              ],
              name: 'keyword',
              type: 'keyword',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'text',
            },
          ],
          name: 'body',
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts in object fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          order: {
            object: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
          },
          'order.id': {
            number: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'number',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'number',
                },
                {
                  name: 'index-001',
                  type: 'text',
                },
              ],
              name: 'id',
              type: 'conflict',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'object',
            },
            {
              name: 'index-002',
              type: 'object',
            },
          ],
          name: 'order',
          type: 'object', // Should this be 'conflict' too?
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts in nested fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          order: {
            nested: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'nested',
            },
          },
          'order.id': {
            number: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'number',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          fields: [
            {
              fields: [],
              indices: [
                {
                  name: 'index-002',
                  type: 'number',
                },
                {
                  name: 'index-001',
                  type: 'text',
                },
              ],
              name: 'id',
              type: 'conflict',
            },
          ],
          indices: [
            {
              name: 'index-001',
              type: 'nested',
            },
            {
              name: 'index-002',
              type: 'nested',
            },
          ],
          name: 'order',
          type: 'nested', // Should this be 'conflict' too?
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
  });
});
