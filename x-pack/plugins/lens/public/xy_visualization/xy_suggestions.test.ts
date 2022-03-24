/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './xy_suggestions';
import type { TableSuggestionColumn, VisualizationSuggestion, TableSuggestion } from '../types';
import { State, XYState, visualizationTypes } from './types';
import { generateId } from '../id_generator';
import { getXyVisualization } from './xy_visualization';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { eventAnnotationServiceMock } from '../../../../../src/plugins/event_annotation/public/mocks';
import { PaletteOutput } from 'src/plugins/charts/public';
import { layerTypes } from '../../common';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import { themeServiceMock } from '../../../../../src/core/public/mocks';
import { XYAnnotationLayerConfig, XYDataLayerConfig } from './types';

jest.mock('../id_generator');

const xyVisualization = getXyVisualization({
  paletteService: chartPluginMock.createPaletteRegistry(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  useLegacyTimeAxis: false,
  kibanaTheme: themeServiceMock.createStartContract(),
  eventAnnotationService: eventAnnotationServiceMock,
});

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

  function staticValueCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Static value: ${columnId}`,
        isBucketed: false,
        isStaticValue: true,
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
    return (suggestion.state.layers as XYDataLayerConfig[]).map(
      ({ seriesType, splitAccessor, xAccessor, accessors }) => ({
        seriesType,
        splitAccessor,
        x: xAccessor,
        y: accessors,
      })
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('partially maps invalid combinations, but hides them', () => {
    expect(
      (
        [
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
            columns: [numCol('bar')],
            layerId: 'first',
            changeType: 'unchanged',
          },
        ] as TableSuggestion[]
      ).map((table) => {
        const suggestions = getSuggestions({ table, keptLayerIds: [] });
        expect(suggestions.every((suggestion) => suggestion.hide)).toEqual(true);
        expect(suggestions).toHaveLength(10);
      })
    );
  });

  test('rejects the configuration when metric isStaticValue', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [staticValueCol('value'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestions).toHaveLength(0);
  });

  test('rejects incomplete configurations if there is a state already but no sub visualization id', () => {
    expect(
      (
        [
          {
            isMultiRow: true,
            columns: [dateCol('a')],
            layerId: 'first',
            changeType: 'reduced',
          },
          {
            isMultiRow: false,
            columns: [numCol('bar')],
            layerId: 'first',
            changeType: 'reduced',
          },
        ] as TableSuggestion[]
      ).map((table) => {
        const suggestions = getSuggestions({
          table,
          keptLayerIds: [],
          state: {} as XYState,
        });
        expect(suggestions).toHaveLength(0);
      })
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
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'bar',
            accessors: ['bytes'],
            splitAccessor: undefined,
            yScaleType: 'linear',
            xScaleType: 'linear',
            isHistogram: false,
            palette: { type: 'palette', name: 'default' },
          },
          {
            layerId: 'second',
            layerType: layerTypes.DATA,
            seriesType: 'bar',
            accessors: ['bytes'],
            splitAccessor: undefined,
            yScaleType: 'linear',
            xScaleType: 'linear',
            isHistogram: false,
            palette: { type: 'palette', name: 'default' },
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
      'bar',
      'bar_horizontal',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
      'line',
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
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
    expect(suggestions.map(({ state }) => xyVisualization.getVisualizationTypeId(state))).toEqual([
      'bar_stacked',
      'bar',
      'bar_horizontal',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
      'line',
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
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessor: undefined,
            yScaleType: 'linear',
            xScaleType: 'linear',
            isHistogram: false,
            palette: { type: 'palette', name: 'default' },
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
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessor: undefined,
            yScaleType: 'linear',
            xScaleType: 'linear',
            isHistogram: false,
            palette: { type: 'palette', name: 'default' },
          },
          {
            layerId: 'second',
            layerType: layerTypes.DATA,
            seriesType: 'bar',
            xAccessor: undefined,
            accessors: [],
            splitAccessor: undefined,
            yScaleType: 'linear',
            xScaleType: 'linear',
            isHistogram: false,
            palette: { type: 'palette', name: 'default' },
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
    expect(suggestion.title).toEqual('Bar vertical stacked');
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

  test('passes annotation layer without modifying it', () => {
    const annotationLayer: XYAnnotationLayerConfig = {
      layerId: 'second',
      layerType: layerTypes.ANNOTATIONS,
      annotations: [
        {
          id: '1',
          key: {
            type: 'point_in_time',
            timestamp: '2020-20-22',
          },
          label: 'annotation',
        },
      ],
    };
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'date',
          xAccessor: 'product',
        },
        annotationLayer,
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

    suggestions.every((suggestion) =>
      expect(suggestion.state.layers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            layerType: layerTypes.ANNOTATIONS,
          }),
        ])
      )
    );
  });

  test('includes passed in palette for split charts if specified', () => {
    const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      mainPalette,
    });

    expect((suggestion.state.layers as XYDataLayerConfig[])[0].palette).toEqual(mainPalette);
  });

  test('ignores passed in palette for non splitted charts', () => {
    const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      mainPalette,
    });

    expect((suggestion.state.layers as XYDataLayerConfig[])[0].palette).toEqual(undefined);
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
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            accessors: ['price', 'quantity'],
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'bar',
            splitAccessor: 'product',
            xAccessor: 'date',
            yScaleType: 'linear',
            xScaleType: 'linear',
            isHistogram: false,
            palette: { type: 'palette', name: 'default' },
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
      valueLabels: 'hide',
      fittingFunction: 'None',
      preferredSeriesType: 'line',
      layers: [
        {
          accessors: [],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'line',
          splitAccessor: undefined,
          xAccessor: '',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
    expect((suggestions[0].state.layers[0] as XYDataLayerConfig).seriesType).toEqual('line');
  });

  test('makes a visible seriesType suggestion for unchanged table without split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: undefined,
          xAccessor: 'date',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'product',
          xAccessor: 'date',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
      valueLabels: 'hide',
      fittingFunction: 'None',
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
    expect(
      (suggestion.state.layers as XYDataLayerConfig[]).every(
        (l) => l.seriesType === 'bar_horizontal'
      )
    ).toBeTruthy();
    expect(suggestion.title).toEqual('Flip');
  });

  test('suggests stacking for unchanged table that has a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'date',
          xAccessor: 'product',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'category',
          xAccessor: 'product',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
          xAccessor: 'product',
          yScaleType: 'linear',
          xScaleType: 'linear',
          isHistogram: false,
          palette: { type: 'palette', name: 'default' },
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
          "x": undefined,
          "y": Array [
            "quantity",
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
              isBucketed: true,
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
