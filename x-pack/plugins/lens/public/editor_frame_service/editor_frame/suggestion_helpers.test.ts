/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions, getTopSuggestionForField } from './suggestion_helpers';
import { createMockVisualization, createMockDatasource, DatasourceMock } from '../../mocks';
import { TableSuggestion, DatasourceSuggestion, Visualization } from '../../types';
import { PaletteOutput } from 'src/plugins/charts/public';

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

let datasourceMap: Record<string, DatasourceMock>;
let datasourceStates: Record<
  string,
  {
    isLoading: boolean;
    state: unknown;
  }
>;

beforeEach(() => {
  datasourceMap = {
    mock: createMockDatasource('a'),
  };

  datasourceStates = {
    mock: {
      isLoading: false,
      state: {},
    },
  };
});

describe('suggestion helpers', () => {
  it('should return suggestions array', () => {
    const mockVisualization = createMockVisualization();
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const suggestedState = {};
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization,
          getSuggestions: () => [
            {
              score: 0.5,
              title: 'Test',
              state: suggestedState,
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].visualizationState).toBe(suggestedState);
  });

  it('should concatenate suggestions from all visualizations', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization1,
          getSuggestions: () => [
            {
              score: 0.5,
              title: 'Test',
              state: {},
              previewIcon: 'empty',
            },
            {
              score: 0.5,
              title: 'Test2',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
        vis2: {
          ...mockVisualization2,
          getSuggestions: () => [
            {
              score: 0.5,
              title: 'Test3',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions).toHaveLength(3);
  });

  it('should call getDatasourceSuggestionsForField when a field is passed', () => {
    datasourceMap.mock.getDatasourceSuggestionsForField.mockReturnValue([generateSuggestion()]);
    const droppedField = {};
    getSuggestions({
      visualizationMap: {
        vis1: createMockVisualization(),
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
      field: droppedField,
    });
    expect(datasourceMap.mock.getDatasourceSuggestionsForField).toHaveBeenCalledWith(
      datasourceStates.mock.state,
      droppedField
    );
  });

  it('should call getDatasourceSuggestionsForField from all datasources with a state', () => {
    const multiDatasourceStates = {
      mock: {
        isLoading: false,
        state: {},
      },
      mock2: {
        isLoading: false,
        state: {},
      },
    };
    const multiDatasourceMap = {
      mock: createMockDatasource('a'),
      mock2: createMockDatasource('a'),
      mock3: createMockDatasource('a'),
    };
    const droppedField = {};
    getSuggestions({
      visualizationMap: {
        vis1: createMockVisualization(),
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap: multiDatasourceMap,
      datasourceStates: multiDatasourceStates,
      field: droppedField,
    });
    expect(multiDatasourceMap.mock.getDatasourceSuggestionsForField).toHaveBeenCalledWith(
      multiDatasourceStates.mock.state,
      droppedField
    );
    expect(multiDatasourceMap.mock2.getDatasourceSuggestionsForField).toHaveBeenCalledWith(
      multiDatasourceStates.mock2.state,
      droppedField
    );
    expect(multiDatasourceMap.mock3.getDatasourceSuggestionsForField).not.toHaveBeenCalled();
  });

  it('should call getDatasourceSuggestionsForVisualizeField when a visualizeTriggerField is passed', () => {
    datasourceMap.mock.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: createMockVisualization(),
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
      visualizeTriggerFieldContext: {
        indexPatternId: '1',
        fieldName: 'test',
      },
    });
    expect(datasourceMap.mock.getDatasourceSuggestionsForVisualizeField).toHaveBeenCalledWith(
      datasourceStates.mock.state,
      '1',
      'test'
    );
  });

  it('should call getDatasourceSuggestionsForVisualizeField from all datasources with a state', () => {
    const multiDatasourceStates = {
      mock: {
        isLoading: false,
        state: {},
      },
      mock2: {
        isLoading: false,
        state: {},
      },
    };
    const multiDatasourceMap = {
      mock: createMockDatasource('a'),
      mock2: createMockDatasource('a'),
      mock3: createMockDatasource('a'),
    };
    const visualizeTriggerField = {
      indexPatternId: '1',
      fieldName: 'test',
    };
    getSuggestions({
      visualizationMap: {
        vis1: createMockVisualization(),
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap: multiDatasourceMap,
      datasourceStates: multiDatasourceStates,
      visualizeTriggerFieldContext: visualizeTriggerField,
    });
    expect(multiDatasourceMap.mock.getDatasourceSuggestionsForVisualizeField).toHaveBeenCalledWith(
      multiDatasourceStates.mock.state,
      '1',
      'test'
    );
    expect(multiDatasourceMap.mock2.getDatasourceSuggestionsForVisualizeField).toHaveBeenCalledWith(
      multiDatasourceStates.mock2.state,
      '1',
      'test'
    );
    expect(
      multiDatasourceMap.mock3.getDatasourceSuggestionsForVisualizeField
    ).not.toHaveBeenCalled();
  });

  it('should rank the visualizations by score', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization1,
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
        vis2: {
          ...mockVisualization2,
          getSuggestions: () => [
            {
              score: 0.6,
              title: 'Test3',
              state: {},
              previewIcon: 'empty',
            },
          ],
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions[0].score).toBe(0.8);
    expect(suggestions[1].score).toBe(0.6);
    expect(suggestions[2].score).toBe(0.2);
  });

  it('should call all suggestion getters with all available data tables', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const table1: TableSuggestion = {
      columns: [],
      isMultiRow: true,
      layerId: 'first',
      changeType: 'unchanged',
    };
    const table2: TableSuggestion = {
      columns: [],
      isMultiRow: true,
      layerId: 'first',
      changeType: 'unchanged',
    };
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      { state: {}, table: table1, keptLayerIds: ['first'] },
      { state: {}, table: table2, keptLayerIds: ['first'] },
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(mockVisualization1.getSuggestions.mock.calls[0][0].table).toEqual(table1);
    expect(mockVisualization1.getSuggestions.mock.calls[1][0].table).toEqual(table2);
    expect(mockVisualization2.getSuggestions.mock.calls[0][0].table).toEqual(table1);
    expect(mockVisualization2.getSuggestions.mock.calls[1][0].table).toEqual(table2);
  });

  it('should map the suggestion ids back to the correct datasource ids and states', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const tableState1 = {};
    const tableState2 = {};
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(tableState1),
      generateSuggestion(tableState2),
    ]);
    const vis1Suggestions = jest.fn();
    vis1Suggestions.mockReturnValueOnce([
      {
        score: 0.3,
        title: 'Test',
        state: {},
        previewIcon: 'empty',
      },
    ]);
    vis1Suggestions.mockReturnValueOnce([
      {
        score: 0.2,
        title: 'Test2',
        state: {},
        previewIcon: 'empty',
      },
    ]);
    const vis2Suggestions = jest.fn();
    vis2Suggestions.mockReturnValueOnce([]);
    vis2Suggestions.mockReturnValueOnce([
      {
        score: 0.1,
        title: 'Test3',
        state: {},
        previewIcon: 'empty',
      },
    ]);
    const suggestions = getSuggestions({
      visualizationMap: {
        vis1: {
          ...mockVisualization1,
          getSuggestions: vis1Suggestions,
        },
        vis2: {
          ...mockVisualization2,
          getSuggestions: vis2Suggestions,
        },
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(suggestions[0].datasourceState).toBe(tableState1);
    expect(suggestions[0].datasourceId).toBe('mock');
    expect(suggestions[1].datasourceState).toBe(tableState2);
    expect(suggestions[1].datasourceId).toBe('mock');
    expect(suggestions[2].datasourceState).toBe(tableState2);
    expect(suggestions[2].datasourceId).toBe('mock');
  });

  it('should pass the state of the currently active visualization to getSuggestions', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const currentState = {};
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(0),
      generateSuggestion(1),
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(mockVisualization1.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        state: currentState,
      })
    );
    expect(mockVisualization2.getSuggestions).not.toHaveBeenCalledWith(
      expect.objectContaining({
        state: currentState,
      })
    );
  });

  it('should pass passed in main palette if specified', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(0),
      generateSuggestion(1),
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
      mainPalette,
    });
    expect(mockVisualization1.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        mainPalette,
      })
    );
    expect(mockVisualization2.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        mainPalette,
      })
    );
  });

  it('should query active visualization for main palette if not specified', () => {
    const mockVisualization1 = createMockVisualization();
    const mockVisualization2 = createMockVisualization();
    const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    mockVisualization1.getMainPalette = jest.fn(() => mainPalette);
    datasourceMap.mock.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(0),
      generateSuggestion(1),
    ]);
    getSuggestions({
      visualizationMap: {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
      },
      activeVisualizationId: 'vis1',
      visualizationState: {},
      datasourceMap,
      datasourceStates,
    });
    expect(mockVisualization1.getMainPalette).toHaveBeenCalledWith({});
    expect(mockVisualization2.getSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        mainPalette,
      })
    );
  });

  describe('getTopSuggestionForField', () => {
    let mockVisualization1: jest.Mocked<Visualization>;
    let mockVisualization2: jest.Mocked<Visualization>;
    let mockDatasourceState: unknown;
    let defaultParams: Parameters<typeof getTopSuggestionForField>;
    beforeEach(() => {
      datasourceMap.mock.getDatasourceSuggestionsForField.mockReturnValue([
        {
          state: {},
          table: {
            isMultiRow: true,
            layerId: '1',
            columns: [],
            changeType: 'unchanged',
          },
          keptLayerIds: [],
        },
      ]);
      mockVisualization1 = createMockVisualization();
      mockVisualization1.getSuggestions.mockReturnValue([
        {
          score: 0.3,
          title: 'second suggestion',
          state: { second: true },
          previewIcon: 'empty',
        },
        {
          score: 0.5,
          title: 'top suggestion',
          state: { first: true },
          previewIcon: 'empty',
        },
      ]);
      mockVisualization2 = createMockVisualization();
      mockVisualization2.getSuggestions.mockReturnValue([
        {
          score: 0.8,
          title: 'other vis suggestion',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      mockDatasourceState = { myDatasourceState: true };
      defaultParams = [
        {
          '1': {
            getTableSpec: () => [{ columnId: 'col1' }],
            datasourceId: '',
            getOperationForColumnId: jest.fn(),
          },
        },
        'vis1',
        { vis1: mockVisualization1 },
        {},
        datasourceMap.mock,
        {
          mockindexpattern: { state: mockDatasourceState, isLoading: false },
        },
        { id: 'myfield', humanData: { label: 'myfieldLabel' } },
      ];
    });

    it('should return top suggestion for field', () => {
      const result = getTopSuggestionForField(...defaultParams);
      expect(result!.title).toEqual('top suggestion');
      expect(datasourceMap.mock.getDatasourceSuggestionsForField).toHaveBeenCalledWith(
        mockDatasourceState,
        {
          id: 'myfield',
          humanData: {
            label: 'myfieldLabel',
          },
        }
      );
    });

    it('should return nothing if visualization does not produce suggestions', () => {
      mockVisualization1.getSuggestions.mockReturnValue([]);
      const result = getTopSuggestionForField(...defaultParams);
      expect(result).toEqual(undefined);
    });

    it('should return nothing if datasource does not produce suggestions', () => {
      datasourceMap.mock.getDatasourceSuggestionsForField.mockReturnValue([]);
      defaultParams[2] = {
        vis1: { ...mockVisualization1, getSuggestions: () => [] },
        vis2: mockVisualization2,
      };
      const result = getTopSuggestionForField(...defaultParams);
      expect(result).toEqual(undefined);
    });

    it('should not consider suggestion from other visualization if there is data', () => {
      defaultParams[2] = {
        vis1: { ...mockVisualization1, getSuggestions: () => [] },
        vis2: mockVisualization2,
      };
      const result = getTopSuggestionForField(...defaultParams);
      expect(result).toBeUndefined();
    });

    it('should consider top suggestion from other visualization if there is no data', () => {
      const mockVisualization3 = createMockVisualization();
      defaultParams[0] = {
        '1': {
          getTableSpec: () => [],
          datasourceId: '',
          getOperationForColumnId: jest.fn(),
        },
      };
      mockVisualization1.getSuggestions.mockReturnValue([]);
      mockVisualization3.getSuggestions.mockReturnValue([
        {
          score: 0.1,
          title: 'low ranking suggestion',
          state: {},
          previewIcon: 'empty',
        },
      ]);
      defaultParams[2] = {
        vis1: mockVisualization1,
        vis2: mockVisualization2,
        vis3: mockVisualization3,
      };
      const result = getTopSuggestionForField(...defaultParams);
      expect(result!.title).toEqual('other vis suggestion');
      expect(mockVisualization1.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization2.getSuggestions).toHaveBeenCalled();
      expect(mockVisualization3.getSuggestions).toHaveBeenCalled();
    });
  });
});
