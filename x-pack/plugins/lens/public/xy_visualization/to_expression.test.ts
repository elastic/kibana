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
        frame
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
        frame
      ) as Ast).chain[0].arguments.fittingFunction[0]
    ).toEqual('None');
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
        frame
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
        frame
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
      frame
    )! as Ast;

    expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('b');
    expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('c');
    expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('d');
    expect(expression.chain[0].arguments.xTitle).toEqual(['col_a']);
    expect(expression.chain[0].arguments.yTitle).toEqual(['col_b']);
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
});
