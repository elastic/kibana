/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
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
      contextualFields: ['field1', 'field2'],
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
      contextualFields: ['field1', 'field2'],
      query: {
        sql: 'SELECT field1, field2 FROM "index1"',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });
});
