/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './xy_suggestions';
import {
  TableSuggestionColumn,
  VisualizationSuggestion,
  DataType,
  TableSuggestion,
} from '../types';
import { State, XYState, visualizationTypes } from './types';
import { generateId } from '../id_generator';
import { xyVisualization } from './xy_visualization';

jest.mock('../id_generator');

describe('xy_suggestions', () => {
  function numCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Avg ${columnId}`,
        isBucketed: false,
        scale: 'ratio',
      },
    };
  }

  function strCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'string',
        label: `Top 5 ${columnId}`,
        isBucketed: true,
        scale: 'ordinal',
      },
    };
  }

  function dateCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'date',
        isBucketed: true,
        label: `${columnId} histogram`,
        scale: 'interval',
      },
    };
  }

  function histogramCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        isBucketed: true,
        label: `${columnId} histogram`,
        scale: 'interval',
      },
    };
  }

  // Helper that plucks out the important part of a suggestion for
  // most test assertions
  function suggestionSubset(suggestion: VisualizationSuggestion<State>) {
    return suggestion.state.layers.map(({ seriesType, splitAccessor, xAccessor, accessors }) => ({
      seriesType,
      splitAccessor,
      x: xAccessor,
      y: accessors,
    }));
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' as DataType } };
    };

    expect(
      ([
        {
          isMultiRow: true,
          columns: [dateCol('a')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        {
          isMultiRow: true,
          columns: [strCol('foo'), strCol('bar')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        {
          isMultiRow: false,
          columns: [strCol('foo'), numCol('bar')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        {
          isMultiRow: true,
          columns: [unknownCol(), numCol('bar')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ] as TableSuggestion[]).map((table) =>
        expect(getSuggestions({ table, keptLayerIds: [] })).toEqual([])
      )
    );
  });

  test('suggests all xy charts without changes to the state when switching among xy charts with malformed table', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: false,
        columns: [numCol('bytes')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      state: {
        legend: { isVisible: true, position: 'bottom' },
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            seriesType: 'bar',
            accessors: ['bytes'],
            splitAccessor: undefined,
          },
          {
            layerId: 'second',
            seriesType: 'bar',
            accessors: ['bytes'],
            splitAccessor: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationTypes.length);
    expect(suggestions.map(({ state }) => xyVisualization.getVisualizationTypeId(state))).toEqual([
      'bar',
      'bar_horizontal',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
      'line',
    ]);
  });

  test('suggests all basic x y charts when switching from another vis', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestions).toHaveLength(visualizationTypes.length);
    expect(suggestions.map(({ state }) => xyVisualization.getVisualizationTypeId(state))).toEqual([
      'bar_stacked',
      'line',
      'area_percentage_stacked',
      'area_stacked',
      'area',
      'bar_horizontal_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_percentage_stacked',
      'bar_horizontal',
      'bar',
    ]);
  });

  // This limitation is acceptable for now, but is now tested
  test('is unable to generate layers when switching from a non-XY chart with multiple layers', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first', 'second'],
    });

    expect(suggestions).toHaveLength(visualizationTypes.length);
    expect(suggestions.map(({ state }) => state.layers.length)).toEqual([
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
    ]);
    expect(suggestions.map(({ state }) => xyVisualization.getVisualizationTypeId(state))).toEqual([
      'bar_stacked',
      'line',
      'area_percentage_stacked',
      'area_stacked',
      'area',
      'bar_horizontal_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_percentage_stacked',
      'bar_horizontal',
      'bar',
    ]);
  });

  test('suggests all basic x y charts when switching from another x y chart', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first'],
      state: {
        legend: { isVisible: true, position: 'bottom' },
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessor: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationTypes.length);
    expect(suggestions.map(({ state }) => xyVisualization.getVisualizationTypeId(state))).toEqual([
      'line',
      'bar',
      'bar_horizontal',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
    ]);
  });

  test('suggests all basic x y charts when switching from another x y chart with multiple layers', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first', 'second'],
      state: {
        legend: { isVisible: true, position: 'bottom' },
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessor: undefined,
          },
          {
            layerId: 'second',
            seriesType: 'bar',
            xAccessor: undefined,
            accessors: [],
            splitAccessor: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationTypes.length);
    expect(suggestions.map(({ state }) => xyVisualization.getVisualizationTypeId(state))).toEqual([
      'line',
      'bar',
      'bar_horizontal',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
    ]);
    expect(suggestions.map(({ state }) => state.layers.map((l) => l.layerId))).toEqual([
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
    ]);
  });

  test('suggests all basic x y chart with date on x', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationTypes.length - 1);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": undefined,
          "x": "date",
          "y": Array [
            "bytes",
          ],
        },
      ]
    `);
  });

  test('suggests all basic x y chart with histogram on x', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), histogramCol('duration')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationTypes.length - 1);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": undefined,
          "x": "duration",
          "y": Array [
            "bytes",
          ],
        },
      ]
    `);
  });

  test('does not suggest multiple splits', () => {
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('price'),
          numCol('quantity'),
          dateCol('date'),
          strCol('product'),
          strCol('city'),
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestions).toHaveLength(0);
  });

  test('suggests a split x y chart with date on x', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationTypes.length - 1);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": "product",
          "x": "date",
          "y": Array [
            "price",
            "quantity",
          ],
        },
      ]
    `);
  });

  test('uses datasource provided title if available', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'extended',
        label: 'Datasource title',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.title).toEqual('Datasource title');
  });

  test('suggests only stacked bar chart when xy chart is inactive', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [dateCol('date'), numCol('price')],
        layerId: 'first',
        changeType: 'unchanged',
        label: 'Datasource title',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationTypes.length - 1);
    expect(suggestion.title).toEqual('Stacked bar');
    expect(suggestion.state).toEqual(
      expect.objectContaining({
        layers: [
          expect.objectContaining({
            seriesType: 'bar_stacked',
            xAccessor: 'date',
            accessors: ['price'],
            splitAccessor: undefined,
          }),
        ],
      })
    );
  });

  test('hides reduced suggestions if there is a current state', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'reduced',
      },
      state: {
        legend: { isVisible: true, position: 'bottom' },
        preferredSeriesType: 'bar',
        layers: [
          {
            accessors: ['price', 'quantity'],
            layerId: 'first',
            seriesType: 'bar',
            splitAccessor: 'product',
            xAccessor: 'date',
          },
        ],
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeTruthy();
  });

  test('hides reduced suggestions if xy visualization is not active', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'reduced',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeTruthy();
  });

  test('respects requested sub visualization type if set', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'reduced',
      },
      keptLayerIds: [],
      subVisualizationId: 'area',
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state.preferredSeriesType).toBe('area');
  });

  test('keeps existing seriesType for initial tables', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      fittingFunction: 'None',
      preferredSeriesType: 'line',
      layers: [
        {
          accessors: [],
          layerId: 'first',
          seriesType: 'line',
          splitAccessor: undefined,
          xAccessor: '',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'initial',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(suggestions).toHaveLength(1);

    expect(suggestions[0].hide).toEqual(false);
    expect(suggestions[0].state.preferredSeriesType).toEqual('line');
    expect(suggestions[0].state.layers[0].seriesType).toEqual('line');
  });

  test('makes a visible seriesType suggestion for unchanged table without split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: undefined,
          xAccessor: 'date',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(suggestions).toHaveLength(visualizationTypes.length);

    expect(suggestions[0].hide).toEqual(false);
    expect(suggestions[0].state).toEqual({
      ...currentState,
      preferredSeriesType: 'line',
      layers: [{ ...currentState.layers[0], seriesType: 'line' }],
    });
    expect(suggestions[0].title).toEqual('Line chart');
  });

  test('suggests seriesType and stacking when there is a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'product',
          xAccessor: 'date',
        },
      ],
    };
    const [seriesSuggestion, stackSuggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(visualizationTypes.length - 2);
    expect(seriesSuggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'line',
      layers: [{ ...currentState.layers[0], seriesType: 'line' }],
    });
    expect(stackSuggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'bar_stacked',
      layers: [{ ...currentState.layers[0], seriesType: 'bar_stacked' }],
    });
    expect(seriesSuggestion.title).toEqual('Line chart');
    expect(stackSuggestion.title).toEqual('Stacked');
  });

  test('suggests a flipped chart for unchanged table and existing bar chart on ordinal x axis', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      fittingFunction: 'None',
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationTypes.length - 1);
    expect(suggestion.state.preferredSeriesType).toEqual('bar_horizontal');
    expect(suggestion.state.layers.every((l) => l.seriesType === 'bar_horizontal')).toBeTruthy();
    expect(suggestion.title).toEqual('Flip');
  });

  test('suggests stacking for unchanged table that has a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'date',
          xAccessor: 'product',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: [],
    });

    const visibleSuggestions = suggestions.filter((suggestion) => !suggestion.hide);
    expect(visibleSuggestions).toContainEqual(
      expect.objectContaining({
        title: 'Stacked',
        state: expect.objectContaining({ preferredSeriesType: 'bar_stacked' }),
      })
    );
  });

  test('keeps column to dimension mappings on extended tables', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), strCol('product'), strCol('category')],
        layerId: 'first',
        changeType: 'extended',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'product',
          splitAccessor: 'category',
        },
      ],
    });
  });

  test('changes column mappings when suggestion is reorder', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'category',
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [strCol('category'), strCol('product'), numCol('price')],
        layerId: 'first',
        changeType: 'reorder',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'category',
          splitAccessor: 'product',
        },
      ],
    });
  });

  test('overwrites column to dimension mappings if a date dimension is added', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), strCol('product'), dateCol('timestamp')],
        layerId: 'first',
        changeType: 'extended',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'timestamp',
          splitAccessor: 'product',
        },
      ],
    });
  });

  test('handles two numeric values', () => {
    (generateId as jest.Mock).mockReturnValueOnce('ddd');
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('quantity'), numCol('price')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": undefined,
          "x": "quantity",
          "y": Array [
            "price",
          ],
        },
      ]
    `);
  });

  test('handles ip', () => {
    (generateId as jest.Mock).mockReturnValueOnce('ddd');
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('quantity'),
          {
            columnId: 'myip',
            operation: {
              dataType: 'ip',
              label: 'Top 5 myip',
              isBucketed: true,
              scale: 'ordinal',
            },
          },
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": undefined,
          "x": "myip",
          "y": Array [
            "quantity",
          ],
        },
      ]
    `);
  });

  test('handles unbucketed suggestions', () => {
    (generateId as jest.Mock).mockReturnValueOnce('eee');
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('num votes'),
          {
            columnId: 'mybool',
            operation: {
              dataType: 'boolean',
              isBucketed: false,
              label: 'Yes / No',
            },
          },
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": undefined,
          "x": "mybool",
          "y": Array [
            "num votes",
          ],
        },
      ]
    `);
  });
});
