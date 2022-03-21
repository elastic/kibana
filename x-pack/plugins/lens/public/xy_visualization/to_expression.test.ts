/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter';
import { Position } from '@elastic/charts';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { getXyVisualization } from './xy_visualization';
import { OperationDescriptor } from '../types';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import { layerTypes } from '../../common';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import { defaultReferenceLineColor } from './color_assignment';
import { themeServiceMock } from '../../../../../src/core/public/mocks';

describe('#toExpression', () => {
  const xyVisualization = getXyVisualization({
    paletteService: chartPluginMock.createPaletteRegistry(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    kibanaTheme: themeServiceMock.createStartContract(),
    useLegacyTimeAxis: false,
  });
  let mockDatasource: ReturnType<typeof createMockDatasource>;
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    mockDatasource = createMockDatasource('testDatasource');

    mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
      { columnId: 'd', fields: [] },
      { columnId: 'a', fields: [] },
      { columnId: 'b', fields: [] },
      { columnId: 'c', fields: [] },
    ]);

    mockDatasource.publicAPIMock.getOperationForColumnId.mockImplementation((col) => {
      return { label: `col_${col}`, dataType: 'number' } as OperationDescriptor;
    });

    frame.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
  });

  it('should map to a valid AST', () => {
    expect(
      xyVisualization.toExpression(
        {
          legend: { position: Position.Bottom, isVisible: true },
          valueLabels: 'hide',
          preferredSeriesType: 'bar',
          fittingFunction: 'Carry',
          tickLabelsVisibilitySettings: { x: false, yLeft: true, yRight: true },
          labelsOrientation: {
            x: 0,
            yLeft: -90,
            yRight: -45,
          },
          gridlinesVisibilitySettings: { x: false, yLeft: true, yRight: true },
          hideEndzones: true,
          yRightExtent: {
            mode: 'custom',
            lowerBound: 123,
            upperBound: 456,
          },
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              splitAccessor: 'd',
              xAccessor: 'a',
              accessors: ['b', 'c'],
            },
          ],
        },
        frame.datasourceLayers
      )
    ).toMatchSnapshot();
  });

  it('should default the fitting function to None', () => {
    expect(
      (
        xyVisualization.toExpression(
          {
            legend: { position: Position.Bottom, isVisible: true },
            valueLabels: 'hide',
            preferredSeriesType: 'bar',
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'a',
                accessors: ['b', 'c'],
              },
            ],
          },
          frame.datasourceLayers
        ) as Ast
      ).chain[0].arguments.fittingFunction[0]
    ).toEqual('None');
  });

  it('should default the axisTitles visibility settings to true', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
          },
        ],
      },
      frame.datasourceLayers
    ) as Ast;
    expect(
      (expression.chain[0].arguments.axisTitlesVisibilitySettings[0] as Ast).chain[0].arguments
    ).toEqual({
      x: [true],
      yLeft: [true],
      yRight: [true],
    });
  });

  it('should generate an expression without x accessor', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: undefined,
            xAccessor: undefined,
            accessors: ['a'],
          },
        ],
      },
      frame.datasourceLayers
    ) as Ast;
    expect((expression.chain[0].arguments.layers[0] as Ast).chain[0].arguments.xAccessor).toEqual(
      []
    );
  });

  it('should not generate an expression when missing y', () => {
    expect(
      xyVisualization.toExpression(
        {
          legend: { position: Position.Bottom, isVisible: true },
          valueLabels: 'hide',
          preferredSeriesType: 'bar',
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              splitAccessor: undefined,
              xAccessor: 'a',
              accessors: [],
            },
          ],
        },
        frame.datasourceLayers
      )
    ).toBeNull();
  });

  it('should default to labeling all columns with their column label', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
          },
        ],
      },
      frame.datasourceLayers
    )! as Ast;

    expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('b');
    expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('c');
    expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('d');
    expect(expression.chain[0].arguments.xTitle).toEqual(['']);
    expect(expression.chain[0].arguments.yTitle).toEqual(['']);
    expect(expression.chain[0].arguments.yRightTitle).toEqual(['']);
    expect(
      (expression.chain[0].arguments.layers[0] as Ast).chain[0].arguments.columnToLabel
    ).toEqual([
      JSON.stringify({
        b: 'col_b',
        c: 'col_c',
        d: 'col_d',
      }),
    ]);
  });

  it('should default the tick labels visibility settings to true', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
          },
        ],
      },
      frame.datasourceLayers
    ) as Ast;
    expect(
      (expression.chain[0].arguments.tickLabelsVisibilitySettings[0] as Ast).chain[0].arguments
    ).toEqual({
      x: [true],
      yLeft: [true],
      yRight: [true],
    });
  });

  it('should default the tick labels orientation settings to 0', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
          },
        ],
      },
      frame.datasourceLayers
    ) as Ast;
    expect((expression.chain[0].arguments.labelsOrientation[0] as Ast).chain[0].arguments).toEqual({
      x: [0],
      yLeft: [0],
      yRight: [0],
    });
  });

  it('should default the gridlines visibility settings to true', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
          },
        ],
      },
      frame.datasourceLayers
    ) as Ast;
    expect(
      (expression.chain[0].arguments.gridlinesVisibilitySettings[0] as Ast).chain[0].arguments
    ).toEqual({
      x: [true],
      yLeft: [true],
      yRight: [true],
    });
  });

  it('should correctly report the valueLabels visibility settings', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'inside',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
          },
        ],
      },
      frame.datasourceLayers
    ) as Ast;
    expect(expression.chain[0].arguments.valueLabels[0] as Ast).toEqual('inside');
  });

  it('should compute the correct series color fallback based on the layer type', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'inside',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'd',
            xAccessor: 'a',
            accessors: ['b', 'c'],
            yConfig: [{ forAccessor: 'a' }],
          },
          {
            layerId: 'referenceLine',
            layerType: layerTypes.REFERENCELINE,
            accessors: ['b', 'c'],
            yConfig: [{ forAccessor: 'a' }],
          },
        ],
      },
      { ...frame.datasourceLayers, referenceLine: mockDatasource.publicAPIMock }
    ) as Ast;

    function getYConfigColorForLayer(ast: Ast, index: number) {
      return ((ast.chain[0].arguments.layers[index] as Ast).chain[0].arguments.yConfig[0] as Ast)
        .chain[0].arguments.color;
    }
    expect(getYConfigColorForLayer(expression, 0)).toEqual([]);
    expect(getYConfigColorForLayer(expression, 1)).toEqual([defaultReferenceLineColor]);
  });
});
