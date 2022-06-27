/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockDatasource } from '../mocks/datasource_mock';
import { getDefaultVisualValuesForLayer } from './datasource_default_values';

describe('getDefaultVisualValuesForLayer', () => {
  it('should return an object with default values for an empty state', () => {
    expect(getDefaultVisualValuesForLayer(undefined, {})).toEqual({ truncateText: true });
  });

  it('should return true if the layer does not have any default for truncation', () => {
    const mockDatasource = createMockDatasource('first');
    expect(
      getDefaultVisualValuesForLayer({ layerId: 'first' }, { first: mockDatasource.publicAPIMock })
    ).toEqual({ truncateText: true });
  });

  it('should prioritize layer settings to default ones ', () => {
    const mockDatasource = createMockDatasource('first');
    mockDatasource.publicAPIMock.getVisualDefaults = jest.fn(() => ({
      col1: { truncateText: false },
    }));
    expect(
      getDefaultVisualValuesForLayer({ layerId: 'first' }, { first: mockDatasource.publicAPIMock })
    ).toEqual({ truncateText: false });
  });

  it('should give priority to first layer', () => {
    const mockDatasource = createMockDatasource('first');
    mockDatasource.publicAPIMock.getVisualDefaults = jest.fn(() => ({
      col1: { truncateText: false },
      col2: { truncateText: true },
    }));
    expect(
      getDefaultVisualValuesForLayer({ layerId: 'first' }, { first: mockDatasource.publicAPIMock })
    ).toEqual({ truncateText: false });
  });
});
