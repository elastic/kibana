/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/target/common';
import { Position } from '@elastic/charts';
import { xyVisualization } from './xy_visualization';
import { Operation } from '../types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';

describe('#toExpression', () => {
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
          preferredSeriesType: 'bar',
          fittingFunction: 'Carry',
          tickLabelsVisibilitySettings: { x: false, y: true },
          gridlinesVisibilitySettings: { x: false, y: true },
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

  it('should default the showXAxisTitle and showYAxisTitle to true', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
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
    expect(expression.chain[0].arguments.showXAxisTitle[0]).toBe(true);
    expect(expression.chain[0].arguments.showYAxisTitle[0]).toBe(true);
  });

  it('should not generate an expression when missing x', () => {
    expect(
      xyVisualization.toExpression(
        {
          legend: { position: Position.Bottom, isVisible: true },
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
      )
    ).toBeNull();
  });

  it('should not generate an expression when missing y', () => {
    expect(
      xyVisualization.toExpression(
        {
          legend: { position: Position.Bottom, isVisible: true },
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
      y: [true],
    });
  });

  it('should default the gridlines visibility settings to true', () => {
    const expression = xyVisualization.toExpression(
      {
        legend: { position: Position.Bottom, isVisible: true },
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
      y: [true],
    });
  });
});
