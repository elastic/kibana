/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'src/core/server';
import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { MappingProperties } from './reindexing/types';

import { addDefaultField, generateDefaultFields } from './query_default_field';

const defaultFieldTypes = new Set(['keyword', 'text', 'ip']);

const asApiResponse = <T>(body: T): RequestEvent<T> =>
  ({
    body,
  } as RequestEvent<T>);

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
  let dataClient: IScopedClusterClient;
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

  beforeEach(() => (dataClient = elasticsearchServiceMock.createScopedClusterClient()));

  it('fails if index already has index.query.default_field setting', async () => {
    (dataClient.asCurrentUser.indices.getSettings as jest.Mock).mockResolvedValueOnce(
      asApiResponse({
        'metricbeat-1': {
          settings: { index: { query: { default_field: [] } } },
        },
      })
    );
    await expect(
      addDefaultField(dataClient, 'metricbeat-1', defaultFieldTypes)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Index metricbeat-1 already has index.query.default_field set"`
    );
  });

  it('updates index settings with default_field generated from mappings and otherFields', async () => {
    (dataClient.asCurrentUser.indices.getSettings as jest.Mock).mockResolvedValueOnce(
      asApiResponse(mockSettings)
    );

    (dataClient.asCurrentUser.indices.getMapping as jest.Mock).mockResolvedValueOnce(
      asApiResponse(mockMappings)
    );

    (dataClient.asCurrentUser.indices.putSettings as jest.Mock).mockResolvedValueOnce(
      asApiResponse({ acknowledged: true })
    );

    await expect(
      addDefaultField(
        dataClient,
        'metricbeat-1',
        defaultFieldTypes,
        new Set(['fields.*', 'myCustomField'])
      )
    ).resolves.toEqual({
      body: { acknowledged: true },
    });
    expect(dataClient.asCurrentUser.indices.putSettings).toHaveBeenCalledWith({
      body: {
        index: {
          query: {
            default_field: ['field1', 'fields.*', 'myCustomField'],
          },
        },
      },
      index: 'metricbeat-1',
    });
  });
});
