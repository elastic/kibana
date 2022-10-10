/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { ExpressionAstExpression, ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import { euiLightVars, euiThemeVars } from '@kbn/ui-theme';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import {
  DatasourceLayers,
  DatasourcePublicAPI,
  OperationDescriptor,
  OperationMetadata,
  Visualization,
} from '../../types';
import { GROUP_ID } from './constants';
import { getMetricVisualization, MetricVisualizationState } from './visualization';
import { themeServiceMock } from '@kbn/core/public/mocks';

const paletteService = chartPluginMock.createPaletteRegistry();
const theme = themeServiceMock.createStartContract();

describe('metric visualization', () => {
  const visualization = getMetricVisualization({
    paletteService,
    theme,
  });

  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: 'foo',
    params: {
      rangeType: 'percent',
    },
  };

  const fullState: Required<MetricVisualizationState> = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: 'subtitle',
    secondaryPrefix: 'extra-text',
    progressDirection: 'vertical',
    maxCols: 5,
    color: 'static-color',
    palette,
  };

  const mockFrameApi = createMockFramePublicAPI();

  describe('initialization', () => {
    test('returns a default state', () => {
      expect(visualization.initialize(() => 'some-id')).toEqual({
        layerId: 'some-id',
        layerType: LayerTypes.DATA,
      });
    });

    test('returns persisted state', () => {
      expect(visualization.initialize(() => fullState.layerId, fullState)).toEqual(fullState);
    });
  });

  describe('dimension groups configuration', () => {
    test('generates configuration', () => {
      expect(
        visualization.getConfiguration({
          state: fullState,
          layerId: fullState.layerId,
          frame: mockFrameApi,
        })
      ).toMatchSnapshot();
    });

    test('color-by-value', () => {
      expect(
        visualization.getConfiguration({
          state: fullState,
          layerId: fullState.layerId,
          frame: mockFrameApi,
        }).groups[0].accessors
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "columnId": "metric-col-id",
            "palette": Array [],
            "triggerIcon": "colorBy",
          },
        ]
      `);

      expect(
        visualization.getConfiguration({
          state: { ...fullState, palette: undefined, color: undefined },
          layerId: fullState.layerId,
          frame: mockFrameApi,
        }).groups[0].accessors
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "color": "#0077cc",
            "columnId": "metric-col-id",
            "triggerIcon": "color",
          },
        ]
      `);
    });

    test('static coloring', () => {
      expect(
        visualization.getConfiguration({
          state: { ...fullState, palette: undefined },
          layerId: fullState.layerId,
          frame: mockFrameApi,
        }).groups[0].accessors
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "color": "static-color",
            "columnId": "metric-col-id",
            "triggerIcon": "color",
          },
        ]
      `);

      expect(
        visualization.getConfiguration({
          state: { ...fullState, color: undefined },
          layerId: fullState.layerId,
          frame: mockFrameApi,
        }).groups[0].accessors
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "columnId": "metric-col-id",
            "palette": Array [],
            "triggerIcon": "colorBy",
          },
        ]
      `);
    });

    test('collapse function', () => {
      expect(
        visualization.getConfiguration({
          state: fullState,
          layerId: fullState.layerId,
          frame: mockFrameApi,
        }).groups[3].accessors
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "columnId": "breakdown-col-id",
            "triggerIcon": "aggregate",
          },
        ]
      `);

      expect(
        visualization.getConfiguration({
          state: { ...fullState, collapseFn: undefined },
          layerId: fullState.layerId,
          frame: mockFrameApi,
        }).groups[3].accessors
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "columnId": "breakdown-col-id",
            "triggerIcon": undefined,
          },
        ]
      `);
    });

    describe('operation filtering', () => {
      const unsupportedDataType = 'string';

      const operations: OperationMetadata[] = [
        {
          isBucketed: true,
          dataType: 'number',
        },
        {
          isBucketed: true,
          dataType: unsupportedDataType,
        },
        {
          isBucketed: false,
          dataType: 'number',
        },
        {
          isBucketed: false,
          dataType: unsupportedDataType,
        },
      ];

      const testConfig = visualization
        .getConfiguration({
          state: fullState,
          layerId: fullState.layerId,
          frame: mockFrameApi,
        })
        .groups.map(({ groupId, filterOperations }) => [groupId, filterOperations]);

      it.each(testConfig)('%s supports correct operations', (_, filterFn) => {
        expect(
          operations.filter(filterFn as (operation: OperationMetadata) => boolean)
        ).toMatchSnapshot();
      });
    });
  });

  describe('generating an expression', () => {
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
                "color": Array [
                  "static-color",
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
                "secondaryPrefix": Array [
                  "extra-text",
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
                "color": Array [
                  "static-color",
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
                "secondaryPrefix": Array [
                  "extra-text",
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
        expect(ast.chain[1].arguments.breakdownBy).toHaveLength(0);
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

    describe('static color', () => {
      it('uses color from state', () => {
        const color = 'color-fun';

        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                color,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toBe(color);
      });

      it('can use a default color', () => {
        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                color: undefined,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toBe(euiLightVars.euiColorPrimary);

        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                maxAccessor: undefined,
                color: undefined,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toEqual(euiThemeVars.euiColorLightestShade);
      });
    });
  });

  it('clears a layer', () => {
    expect(visualization.clearLayer(fullState, 'some-id', 'indexPattern1')).toMatchInlineSnapshot(`
      Object {
        "layerId": "first",
        "layerType": "data",
      }
    `);
  });

  test('getLayerIds returns the single layer ID', () => {
    expect(visualization.getLayerIds(fullState)).toEqual([fullState.layerId]);
  });

  it('gives a description', () => {
    expect(visualization.getDescription(fullState)).toMatchInlineSnapshot(`
      Object {
        "icon": [Function],
        "label": "Metric",
      }
    `);
  });

  describe('getting supported layers', () => {
    it('works without state', () => {
      const supportedLayers = visualization.getSupportedLayers();
      expect(supportedLayers[0].initialDimensions).toBeUndefined();
      expect(supportedLayers).toMatchInlineSnapshot(`
        Array [
          Object {
            "initialDimensions": undefined,
            "label": "Visualization",
            "type": "data",
          },
        ]
      `);
    });

    it('includes max static value dimension when state provided', () => {
      const supportedLayers = visualization.getSupportedLayers(fullState);
      expect(supportedLayers[0].initialDimensions).toHaveLength(1);
      expect(supportedLayers[0].initialDimensions![0]).toEqual(
        expect.objectContaining({
          groupId: GROUP_ID.MAX,
          staticValue: 0,
        })
      );
    });
  });

  it('sets dimensions', () => {
    const state = {} as MetricVisualizationState;
    const columnId = 'col-id';
    expect(
      visualization.setDimension({
        prevState: state,
        columnId,
        groupId: GROUP_ID.METRIC,
        layerId: 'some-id',
        frame: mockFrameApi,
      })
    ).toEqual({
      metricAccessor: columnId,
    });
    expect(
      visualization.setDimension({
        prevState: state,
        columnId,
        groupId: GROUP_ID.SECONDARY_METRIC,
        layerId: 'some-id',
        frame: mockFrameApi,
      })
    ).toEqual({
      secondaryMetricAccessor: columnId,
    });
    expect(
      visualization.setDimension({
        prevState: state,
        columnId,
        groupId: GROUP_ID.MAX,
        layerId: 'some-id',
        frame: mockFrameApi,
      })
    ).toEqual({
      maxAccessor: columnId,
    });
    expect(
      visualization.setDimension({
        prevState: state,
        columnId,
        groupId: GROUP_ID.BREAKDOWN_BY,
        layerId: 'some-id',
        frame: mockFrameApi,
      })
    ).toEqual({
      breakdownByAccessor: columnId,
    });
  });

  describe('removing a dimension', () => {
    const removeDimensionParam: Parameters<
      Visualization<MetricVisualizationState>['removeDimension']
    >[0] = {
      layerId: 'some-id',
      columnId: '',
      frame: mockFrameApi,
      prevState: fullState,
    };

    it('removes metric dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.metricAccessor!,
      });

      expect(removed).not.toHaveProperty('metricAccessor');
      expect(removed).not.toHaveProperty('palette');
      expect(removed).not.toHaveProperty('color');
    });
    it('removes secondary metric dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.secondaryMetricAccessor!,
      });

      expect(removed).not.toHaveProperty('secondaryMetricAccessor');
      expect(removed).not.toHaveProperty('secondaryPrefix');
    });
    it('removes max dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.maxAccessor!,
      });

      expect(removed).not.toHaveProperty('maxAccessor');
      expect(removed).not.toHaveProperty('progressDirection');
    });
    it('removes breakdown-by dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.breakdownByAccessor!,
      });

      expect(removed).not.toHaveProperty('breakdownByAccessor');
      expect(removed).not.toHaveProperty('collapseFn');
      expect(removed).not.toHaveProperty('maxCols');
    });
  });

  it('implements custom display options', () => {
    expect(visualization.getDisplayOptions!()).toEqual({
      noPanelTitle: true,
      noPadding: true,
    });
  });
});
