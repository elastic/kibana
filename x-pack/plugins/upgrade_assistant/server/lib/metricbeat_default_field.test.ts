/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MappingProperties } from './reindexing/types';

import {
  fixMetricbeatIndex,
  getDefaultFieldList,
  isMetricbeatIndex,
} from './metricbeat_default_field';

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

    expect(getDefaultFieldList(mapping)).toMatchInlineSnapshot(`
Array [
  "nested1.included2",
  "nested1.nested2.included3",
  "nested1.nested2.included4.keyword",
  "included1",
]
`);
  });
});

describe('isMetricbeatIndex', () => {
  it('returns true for metricbeat-* indices missing the default_field setting', async () => {
    const callWithRequest = jest.fn(() => ({
      'metricbeat-1': {
        settings: {},
      },
    })) as any;

    await expect(isMetricbeatIndex(callWithRequest, {} as any, 'metricbeat-1')).resolves.toBe(true);
    expect(callWithRequest.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {},
  "indices.getSettings",
  Object {
    "index": "metricbeat-1",
  },
]
`);
  });

  it('returns false for metricbeat-* indices with the default_field setting', async () => {
    const callWithRequest = jest.fn(() => ({
      'metricbeat-1': {
        settings: { index: { query: { default_field: '' } } },
      },
    })) as any;

    await expect(isMetricbeatIndex(callWithRequest, {} as any, 'metricbeat-1')).resolves.toBe(
      false
    );
  });

  it('returns false for myIndex missing the default_field setting', async () => {
    const callWithRequest = jest.fn(() => ({
      myIndex: {
        settings: {},
      },
    })) as any;

    await expect(isMetricbeatIndex(callWithRequest, {} as any, 'myIndex')).resolves.toBe(false);
  });
});

describe('fixMetricbeatIndex', () => {
  const mockMappings = {
    'metricbeat-1': {
      mappings: { _doc: { properties: { field1: { type: 'text' }, field2: { type: 'float' } } } },
    },
  };
  const mockSettings = {
    'metricbeat-1': {
      settings: {},
    },
  };

  it('fails if index is not metricbeat-*', async () => {
    const callWithRequest = jest.fn();
    await expect(
      fixMetricbeatIndex(callWithRequest, {} as any, 'myIndex')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Index must be a 6.x index created by Metricbeat"`
    );
  });

  it('fails if index already has index.query.default_field setting', async () => {
    const callWithRequest = jest.fn().mockResolvedValueOnce({
      'metricbeat-1': {
        settings: { index: { query: { default_field: '' } } },
      },
    });
    await expect(
      fixMetricbeatIndex(callWithRequest, {} as any, 'metricbeat-1')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Index must be a 6.x index created by Metricbeat"`
    );
  });

  it('updates index settings with default_field generated from mappings', async () => {
    const callWithRequest = jest
      .fn()
      .mockResolvedValueOnce(mockSettings)
      .mockResolvedValueOnce(mockMappings)
      .mockResolvedValueOnce({ acknowledged: true });

    await expect(fixMetricbeatIndex(callWithRequest, {} as any, 'metricbeat-1')).resolves.toEqual({
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
