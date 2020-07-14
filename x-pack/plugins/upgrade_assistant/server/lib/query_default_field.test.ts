/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ILegacyScopedClusterClient } from 'src/core/server';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { MappingProperties } from './reindexing/types';

import { addDefaultField, generateDefaultFields } from './query_default_field';

const defaultFieldTypes = new Set(['keyword', 'text', 'ip']);

describe('getDefaultFieldList', () => {
  it('returns dot-delimited flat list', () => {
    const mapping: MappingProperties = {
      nested1: {
        properties: {
          included2: { type: 'ip' },
          ignored2: { type: 'geopoint' },
          nested2: {
            properties: {
              included3: { type: 'keyword' },
              'included4.keyword': { type: 'keyword' },
            },
          },
        },
      },
      ignored1: { type: 'object' },
      included1: { type: 'text' },
    };

    expect(generateDefaultFields(mapping, defaultFieldTypes)).toMatchInlineSnapshot(`
      Array [
        "nested1.included2",
        "nested1.nested2.included3",
        "nested1.nested2.included4.keyword",
        "included1",
      ]
    `);
  });
});

describe('fixMetricbeatIndex', () => {
  let dataClient: ILegacyScopedClusterClient;
  const mockMappings = {
    'metricbeat-1': {
      mappings: { properties: { field1: { type: 'text' }, field2: { type: 'float' } } },
    },
  };
  const mockSettings = {
    'metricbeat-1': {
      settings: {},
    },
  };

  beforeEach(() => (dataClient = elasticsearchServiceMock.createLegacyScopedClusterClient()));

  it('fails if index already has index.query.default_field setting', async () => {
    (dataClient.callAsCurrentUser as jest.Mock).mockResolvedValueOnce({
      'metricbeat-1': {
        settings: { index: { query: { default_field: [] } } },
      },
    });
    await expect(
      addDefaultField(dataClient, 'metricbeat-1', defaultFieldTypes)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Index metricbeat-1 already has index.query.default_field set"`
    );
  });

  it('updates index settings with default_field generated from mappings and otherFields', async () => {
    (dataClient.callAsCurrentUser as jest.Mock)
      .mockResolvedValueOnce(mockSettings)
      .mockResolvedValueOnce(mockMappings)
      .mockResolvedValueOnce({ acknowledged: true });

    await expect(
      addDefaultField(
        dataClient,
        'metricbeat-1',
        defaultFieldTypes,
        new Set(['fields.*', 'myCustomField'])
      )
    ).resolves.toEqual({
      acknowledged: true,
    });
    expect((dataClient.callAsCurrentUser as jest.Mock).mock.calls[2]).toMatchInlineSnapshot(`
      Array [
        "indices.putSettings",
        Object {
          "body": Object {
            "index": Object {
              "query": Object {
                "default_field": Array [
                  "field1",
                  "fields.*",
                  "myCustomField",
                ],
              },
            },
          },
          "index": "metricbeat-1",
        },
      ]
    `);
  });
});
