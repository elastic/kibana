/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '@kbn/data-views-plugin/common';
import { entityDefinition } from '../helpers/fixtures/entity_definition';
import { entityDefinitionWithBackfill } from '../helpers/fixtures/entity_definition_with_backfill';
import {
  generateBackfillHistoryTransform,
  generateHistoryTransform,
  getIndexPatterns,
} from './generate_history_transform';

const mockGetDataView = jest.fn();
const dataViewsService = { get: mockGetDataView } as unknown as DataViewsService;

const dataViewId = 'dataViewId';
const definitionWithDataViewId = {
  ...entityDefinition,
  indexPatterns: undefined,
  dataViewId,
};

describe('generateHistoryTransform(definition)', () => {
  it('should generate a valid history transform', async () => {
    const transform = await generateHistoryTransform(entityDefinition, dataViewsService);
    expect(transform).toMatchSnapshot();
  });
  it('should generate a valid history backfill transform', async () => {
    const transform = await generateBackfillHistoryTransform(
      entityDefinitionWithBackfill,
      dataViewsService
    );
    expect(transform).toMatchSnapshot();
  });

  describe('getIndexPatterns', () => {
    it('should return indexPatterns if defined in the entity definition', async () => {
      const definitionWithIndexPatterns = {
        ...entityDefinition,
        indexPatterns: ['pattern1', 'pattern2'],
      };
      const indexPatterns = await getIndexPatterns(definitionWithIndexPatterns, dataViewsService);
      expect(indexPatterns).toEqual(['pattern1', 'pattern2']);
    });

    it('should return data view index pattern if dataViewId is defined', async () => {
      mockGetDataView.mockResolvedValue({ getIndexPattern: () => 'dataViewPattern' });
      const indexPatterns = await getIndexPatterns(definitionWithDataViewId, dataViewsService);
      expect(indexPatterns).toEqual(['dataViewPattern']);
    });

    it('should throw an error if data view is not found', async () => {
      mockGetDataView.mockRejectedValue(new Error('Data view not found'));
      await expect(getIndexPatterns(definitionWithDataViewId, dataViewsService)).rejects.toThrow(
        `Data view 'dataViewId' not found for entity definition '${definitionWithDataViewId.id}'. Data view not found`
      );
    });
  });
});
