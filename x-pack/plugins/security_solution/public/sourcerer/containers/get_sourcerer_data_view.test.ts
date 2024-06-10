/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSourcererDataView } from './get_sourcerer_data_view';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';

const dataViewId = 'test-id';
const dataViewsService = {
  get: jest.fn().mockResolvedValue({
    toSpec: jest.fn().mockReturnValue({
      id: 'test-id',
      fields: {},
      runtimeFieldMap: {},
    }),
    getIndexPattern: jest.fn().mockReturnValue('test-pattern'),
    fields: {},
  }),
  getExistingIndices: jest.fn().mockResolvedValue(['test-pattern']),
} as unknown as jest.Mocked<DataViewsServicePublic>;
describe('getSourcererDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // Tests that the function returns a SourcererDataView object with the expected properties
  it('should return a SourcererDataView object with the expected properties', async () => {
    const result = await getSourcererDataView(dataViewId, dataViewsService);
    expect(result).toEqual({
      loading: false,
      id: 'test-id',
      title: 'test-pattern',
      indexFields: {},
      fields: {},
      patternList: ['test-pattern'],
      dataView: {
        id: 'test-id',
        fields: {},
        runtimeFieldMap: {},
      },
      browserFields: {},
      runtimeMappings: {},
    });
  });
  it('should call dataViewsService.get with the correct arguments', async () => {
    await getSourcererDataView(dataViewId, dataViewsService);
    expect(dataViewsService.get).toHaveBeenCalledWith(dataViewId, true, false);
  });

  it('should call dataViewsService.getExistingIndices with the correct arguments', async () => {
    await getSourcererDataView(dataViewId, dataViewsService);
    expect(dataViewsService.getExistingIndices).toHaveBeenCalledWith(['test-pattern']);
  });
});
