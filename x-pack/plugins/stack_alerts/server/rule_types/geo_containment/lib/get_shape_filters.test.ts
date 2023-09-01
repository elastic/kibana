/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { canSkipBoundariesFetch, getShapeFilters } from './get_shape_filters';

const boundariesRequestMeta = {
  geoField: 'entityGeometry',
  boundaryIndexTitle: 'boundaries',
  boundaryGeoField: 'boundariesGeometry',
  boundaryNameField: 'boundaryName',
  boundaryIndexQuery: {
    language: 'kuery',
    query: 'iso2 : US',
  },
};

describe('canSkipBoundariesFetch', () => {
  test('should return false when previous request meta is undefined', () => {
    expect(canSkipBoundariesFetch(boundariesRequestMeta, undefined)).toBe(false);
  });

  test('should return false when boundaries query changes', () => {
    expect(
      canSkipBoundariesFetch(
        {
          ...boundariesRequestMeta,
          boundaryIndexQuery: {
            language: 'kuery',
            query: 'iso2 : CA',
          },
        },
        { ...boundariesRequestMeta }
      )
    ).toBe(false);
  });

  test('should return true when request meta is not changed', () => {
    expect(canSkipBoundariesFetch(boundariesRequestMeta, { ...boundariesRequestMeta })).toBe(true);
  });
});

describe('getShapeFilters', () => {
  test('should return boundary filters', async () => {
    const mockEsClient = {
      search: () => {
        return {
          hits: {
            hits: [
              {
                _index: 'boundaries',
                _id: 'waFXH3kBi9P-_6qn8c8A',
                fields: {
                  boundaryName: ['alpha'],
                },
              },
              {
                _index: 'boundaries',
                _id: 'wqFXH3kBi9P-_6qn8c8A',
                fields: {
                  boundaryName: ['bravo'],
                },
              },
              {
                _index: 'boundaries',
                _id: 'w6FXH3kBi9P-_6qn8c8A',
                fields: {
                  boundaryName: ['charlie'],
                },
              },
            ],
          },
        };
      },
    } as unknown as ElasticsearchClient;
    const { shapesFilters, shapesIdsNamesMap } = await getShapeFilters(
      boundariesRequestMeta,
      mockEsClient
    );
    expect(shapesIdsNamesMap).toEqual({
      'waFXH3kBi9P-_6qn8c8A': 'alpha',
      'wqFXH3kBi9P-_6qn8c8A': 'bravo',
      'w6FXH3kBi9P-_6qn8c8A': 'charlie',
    });
    expect(shapesFilters).toEqual({
      'waFXH3kBi9P-_6qn8c8A': {
        geo_shape: {
          entityGeometry: {
            indexed_shape: {
              id: 'waFXH3kBi9P-_6qn8c8A',
              index: 'boundaries',
              path: 'boundariesGeometry',
            },
          },
        },
      },
      'wqFXH3kBi9P-_6qn8c8A': {
        geo_shape: {
          entityGeometry: {
            indexed_shape: {
              id: 'wqFXH3kBi9P-_6qn8c8A',
              index: 'boundaries',
              path: 'boundariesGeometry',
            },
          },
        },
      },
      'w6FXH3kBi9P-_6qn8c8A': {
        geo_shape: {
          entityGeometry: {
            indexed_shape: {
              id: 'w6FXH3kBi9P-_6qn8c8A',
              index: 'boundaries',
              path: 'boundariesGeometry',
            },
          },
        },
      },
    });
  });

  test('should throw error when search throws', async () => {
    const mockEsClient = {
      search: () => {
        throw new Error('Simulated elasticsearch search error');
      },
    } as unknown as ElasticsearchClient;
    expect(async () => {
      await getShapeFilters(boundariesRequestMeta, mockEsClient);
    }).rejects.toThrow();
  });

  test('should throw error if no results found', async () => {
    const mockEsClient = {
      search: () => {
        return {
          hits: {
            hits: [],
          },
        };
      },
    } as unknown as ElasticsearchClient;
    expect(async () => {
      await getShapeFilters(boundariesRequestMeta, mockEsClient);
    }).rejects.toThrow();
  });
});
