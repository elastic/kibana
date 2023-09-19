/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { createMockVisualization, DatasourceMock, createMockDatasource } from './mocks';
import { DatasourceSuggestion } from './types';
import { suggestionsApi } from './lens_suggestions_api';

const generateSuggestion = (state = {}, layerId: string = 'first'): DatasourceSuggestion => ({
  state,
  table: {
    columns: [],
    isMultiRow: false,
    layerId,
    changeType: 'unchanged',
  },
  keptLayerIds: [layerId],
});

const textBasedQueryColumns = [
  {
    id: 'field1',
    name: 'field1',
    meta: {
      type: 'number',
    },
  },
  {
    id: 'field2',
    name: 'field2',
    meta: {
      type: 'string',
    },
  },
] as DatatableColumn[];

describe('suggestionsApi', () => {
  let datasourceMap: Record<string, DatasourceMock>;
  const mockVis = createMockVisualization();
  beforeEach(() => {
    datasourceMap = {
      textBased: createMockDatasource('textBased'),
    };
  });
  test('call the getDatasourceSuggestionsForVisualizeField for the text based query', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        sql: 'SELECT field1, field2 FROM "index1"',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField).toHaveBeenCalledWith(
      { layers: {}, fieldList: [], indexPatternRefs: [], initialContext: context },
      'index1',
      '',
      { index1: { id: 'index1' } }
    );
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).not.toHaveBeenCalled();
    expect(suggestions?.length).toEqual(0);
  });

  test('returns the visualizations suggestions', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.2,
            title: 'Test',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        sql: 'SELECT field1, field2 FROM "index1"',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });

  test('filters out legacy metric and incomplete suggestions', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.2,
            title: 'Test',
            state: {},
            previewIcon: 'empty',
            visualizationId: 'lnsLegacyMetric',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        sql: 'SELECT field1, field2 FROM "index1"',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });

  test('filters out the suggestion if exists on excludedVisualizations', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.2,
            title: 'Test',
            state: {},
            previewIcon: 'empty',
            visualizationId: 'lnsXY',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        sql: 'SELECT field1, field2 FROM "index1"',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      excludedVisualizations: ['lnsXY'],
    });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });
});
