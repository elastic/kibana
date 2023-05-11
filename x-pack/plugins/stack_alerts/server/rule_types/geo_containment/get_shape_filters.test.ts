/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canSkipBoundariesFetch } from './get_shape_filters';

describe('canSkipBoundariesFetch', () => {
  const boundariesRequestMeta = {
    geoField: 'entityGeometry',
    boundaryIndexTitle: 'boundaries',
    boundaryGeoField: 'boundariesGeometry',
    boundaryNameField: 'boundaryName',
    boundaryIndexQuery: {
      language: 'kuery',
      query: 'iso2 : US',
    },
  }
  test('should return false when previous request meta is undefined', () => {
    expect(canSkipBoundariesFetch(boundariesRequestMeta, undefined)).toBe(false);
  });

  test('should return false when boundaries query changes', () => {
    expect(canSkipBoundariesFetch({
      ...boundariesRequestMeta,
      boundaryIndexQuery: {
        language: 'kuery',
        query: 'iso2 : CA',
      },
    }, { ...boundariesRequestMeta })).toBe(false);
  });

  test('should return true when request meta is not changed', () => {
    expect(canSkipBoundariesFetch(boundariesRequestMeta, { ...boundariesRequestMeta })).toBe(true);
  });
});