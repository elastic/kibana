/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { ExpressionAstExpression, ExpressionAstFunction } from '@kbn/expressions-plugin';
import { createMockDatasource } from '../../mocks';
import { DatasourceLayers, DatasourcePublicAPI, OperationDescriptor } from '../../types';
import { getMetricVisualization, MetricVisualizationState } from './visualization';

const paletteService = chartPluginMock.createPaletteRegistry();

describe('metric visualization', () => {
  describe('generating an expression', () => {
    const visualization = getMetricVisualization({
      paletteService,
    });

    const palette: PaletteOutput<CustomPaletteParams> = {
      type: 'palette',
      name: 'foo',
      params: {
        rangeType: 'percent',
      },
    };

    const fullState: MetricVisualizationState = {
      layerId: 'first',
      layerType: 'data',
      metricAccessor: 'metric-col-id',
      secondaryMetricAccessor: 'secondary-metric-col-id',
      maxAccessor: 'max-metric-col-id',
      breakdownByAccessor: 'breakdown-col-id',
      collapseFn: 'sum',
      subtitle: 'subtitle',
      extraText: 'extra-text',
      progressDirection: 'vertical',
      maxCols: 5,
      palette,
    };

    const maxPossibleNumValues = 7;
    let datasourceLayers: DatasourceLayers;
    beforeEach(() => {
      const mockDatasource = createMockDatasource('testDatasource');
      mockDatasource.publicAPIMock.getMaxPossibleNumValues.mockReturnValue(maxPossibleNumValues);
      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        isStaticValue: false,
      } as OperationDescriptor);

      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    it('is null when no metric accessor', () => {
      const state: MetricVisualizationState = {
        layerId: 'first',
        layerType: 'data',
        metricAccessor: undefined,
      };

      expect(visualization.toExpression(state, datasourceLayers)).toBeNull();
    });

    it('builds single metric', () => {
      expect(
        visualization.toExpression(
          {
            ...fullState,
            breakdownByAccessor: undefined,
            collapseFn: undefined,
          },
          datasourceLayers
        )
      ).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "breakdownBy": Array [],
                "extraText": Array [
                  "extra-text",
                ],
                "max": Array [
                  "max-metric-col-id",
                ],
                "maxCols": Array [
                  5,
                ],
                "metric": Array [
                  "metric-col-id",
                ],
                "minTiles": Array [],
                "palette": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "name": Array [
                            "mocked",
                          ],
                        },
                        "function": "system_palette",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "progressDirection": Array [
                  "vertical",
                ],
                "secondaryMetric": Array [
                  "secondary-metric-col-id",
                ],
                "subtitle": Array [
                  "subtitle",
                ],
              },
              "function": "metricVis",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    it('builds breakdown by metric', () => {
      expect(visualization.toExpression({ ...fullState, collapseFn: undefined }, datasourceLayers))
        .toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "breakdownBy": Array [
                  "breakdown-col-id",
                ],
                "extraText": Array [
                  "extra-text",
                ],
                "max": Array [
                  "max-metric-col-id",
                ],
                "maxCols": Array [
                  5,
                ],
                "metric": Array [
                  "metric-col-id",
                ],
                "minTiles": Array [
                  7,
                ],
                "palette": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "name": Array [
                            "mocked",
                          ],
                        },
                        "function": "system_palette",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "progressDirection": Array [
                  "vertical",
                ],
                "secondaryMetric": Array [
                  "secondary-metric-col-id",
                ],
                "subtitle": Array [
                  "subtitle",
                ],
              },
              "function": "metricVis",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    describe('with collapse function', () => {
      it('builds breakdown by metric with collapse function', () => {
        const ast = visualization.toExpression(
          {
            ...fullState,
            collapseFn: 'sum',
            // Turning off an accessor to make sure it gets filtered out from the collapse arguments
            secondaryMetricAccessor: undefined,
          },
          datasourceLayers
        ) as ExpressionAstExpression;

        expect(ast.chain).toHaveLength(2);
        expect(ast.chain[0]).toMatchInlineSnapshot(`
          Object {
            "arguments": Object {
              "by": Array [],
              "fn": Array [
                "sum",
                "sum",
              ],
              "metric": Array [
                "metric-col-id",
                "max-metric-col-id",
              ],
            },
            "function": "lens_collapse",
            "type": "function",
          }
        `);
        expect(ast.chain[1].arguments.minTiles).toHaveLength(0);
      });

      it('always applies max function to static max dimensions', () => {
        (
          datasourceLayers.first as jest.Mocked<DatasourcePublicAPI>
        ).getOperationForColumnId.mockReturnValueOnce({
          isStaticValue: true,
        } as OperationDescriptor);

        const ast = visualization.toExpression(
          {
            ...fullState,
            collapseFn: 'sum', // this should be overridden for the max dimension
          },
          datasourceLayers
        ) as ExpressionAstExpression;

        expect(ast.chain).toHaveLength(2);
        expect(ast.chain[0]).toMatchInlineSnapshot(`
          Object {
            "arguments": Object {
              "by": Array [],
              "fn": Array [
                "sum",
                "sum",
                "max",
              ],
              "metric": Array [
                "metric-col-id",
                "secondary-metric-col-id",
                "max-metric-col-id",
              ],
            },
            "function": "lens_collapse",
            "type": "function",
          }
        `);
      });
    });

    it('builds version for suggestions', () => {
      const state: MetricVisualizationState = {
        layerId: 'first',
        layerType: 'data',
        metricAccessor: 'metric-col-id',
        secondaryMetricAccessor: 'secondary-metric-col-id',
        maxAccessor: 'max-metric-col-id',
        breakdownByAccessor: 'breakdown-col-id',
        subtitle: 'subtitle',
        extraText: 'extra-text',
        progressDirection: 'vertical',
        maxCols: 5,
      };

      const expression = visualization.toPreviewExpression!(
        state,
        datasourceLayers
      ) as ExpressionAstExpression;

      expect(expression.chain[0].arguments.minTiles).toHaveLength(0);
    });

    it('incorporates datasource expression if provided', () => {
      const datasourceFn: ExpressionAstFunction = {
        type: 'function',
        function: 'some-data-function',
        arguments: {},
      };

      const datasourceExpressionsByLayers: Record<string, ExpressionAstExpression> = {
        first: { type: 'expression', chain: [datasourceFn] },
      };

      const ast = visualization.toExpression(
        fullState,
        datasourceLayers,
        {},
        datasourceExpressionsByLayers
      ) as ExpressionAstExpression;

      expect(ast.chain).toHaveLength(3);
      expect(ast.chain[0]).toEqual(datasourceFn);
    });
  });
});
