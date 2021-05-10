/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter/target/common';
import { Position } from '@elastic/charts';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { getXyVisualization } from './xy_visualization';
import { Operation } from '../types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';

describe('#toExpression', () => {
  const xyVisualization = getXyVisualization({
    paletteService: chartPluginMock.createPaletteRegistry(),
    data: dataPluginMock.createStartContract(),
  });
  let mockDatasource: ReturnType<typeof createMockDatasource>;
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    mockDatasource = createMockDatasource('testDatasource');

    mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
      { columnId: 'd' },
      { columnId: 'a' },
      { columnId: 'b' },
      { columnId: 'c' },
    ]);

    mockDatasource.publicAPIMock.getOperationForColumnId.mockImplementation((col) => {
      return { label: `col_${col}`, dataType: 'number' } as Operation;
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
          gridlinesVisibilitySettings: { x: false, yLeft: true, yRight: true },
          hideEndzones: true,
          layers: [
            {
              layerId: 'first',
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
      (xyVisualization.toExpression(
        {
          legend: { position: Position.Bottom, isVisible: true },
          valueLabels: 'hide',
          preferredSeriesType: 'bar',
          layers: [
            {
              layerId: 'first',
              seriesType: 'area',
              splitAccessor: 'd',
              xAccessor: 'a',
              accessors: ['b', 'c'],
            },
          ],
        },
        frame.datasourceLayers
      ) as Ast).chain[0].arguments.fittingFunction[0]
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

  it('should default the gridlines visibility settings to true', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
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
});
