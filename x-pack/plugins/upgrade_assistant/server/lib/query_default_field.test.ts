/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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

  it('fails if index already has index.query.default_field setting', async () => {
    const callWithRequest = jest.fn().mockResolvedValueOnce({
      'metricbeat-1': {
        settings: { index: { query: { default_field: [] } } },
      },
    });
    await expect(
      addDefaultField(callWithRequest, {} as any, 'metricbeat-1', defaultFieldTypes)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Index metricbeat-1 already has index.query.default_field set"`
    );
  });

  it('updates index settings with default_field generated from mappings and otherFields', async () => {
    const callWithRequest = jest
      .fn()
      .mockResolvedValueOnce(mockSettings)
      .mockResolvedValueOnce(mockMappings)
      .mockResolvedValueOnce({ acknowledged: true });

    await expect(
      addDefaultField(
        callWithRequest,
        {} as any,
        'metricbeat-1',
        defaultFieldTypes,
        new Set(['fields.*', 'myCustomField'])
      )
    ).resolves.toEqual({
      acknowledged: true,
    });
    expect(callWithRequest.mock.calls[2]).toMatchInlineSnapshot(`
Array [
  Object {},
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
