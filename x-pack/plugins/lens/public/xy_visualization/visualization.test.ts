/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getXyVisualization } from './visualization';
import { Position } from '@elastic/charts';
import { Operation, VisualizeEditorContext, Suggestion, OperationDescriptor } from '../types';
import type {
  State,
  XYState,
  XYSuggestion,
  XYLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
} from './types';
import { SeriesType } from '../../../../../src/plugins/chart_expressions/expression_xy/common';
import { layerTypes } from '../../common';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import { LensIconChartBar } from '../assets/chart_bar';
import type { VisualizeEditorLayersContext } from '../../../../../src/plugins/visualizations/public';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import { Datatable } from 'src/plugins/expressions';
import { themeServiceMock } from '../../../../../src/core/public/mocks';
import { eventAnnotationServiceMock } from 'src/plugins/event_annotation/public/mocks';
import { EventAnnotationConfig } from 'src/plugins/event_annotation/common';

const exampleAnnotation: EventAnnotationConfig = {
  id: 'an1',
  label: 'Event 1',
  key: {
    type: 'point_in_time',
    timestamp: '2022-03-18T08:25:17.140Z',
  },
  icon: 'circle',
};
const exampleAnnotation2: EventAnnotationConfig = {
  icon: 'circle',
  id: 'an2',
  key: {
    timestamp: '2022-04-18T11:01:59.135Z',
    type: 'point_in_time',
  },
  label: 'Annotation2',
};

function exampleState(): XYState {
  return {
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
  };
}
const paletteServiceMock = chartPluginMock.createPaletteRegistry();
const fieldFormatsMock = fieldFormatsServiceMock.createStartContract();

const xyVisualization = getXyVisualization({
  paletteService: paletteServiceMock,
  fieldFormats: fieldFormatsMock,
  useLegacyTimeAxis: false,
  kibanaTheme: themeServiceMock.createStartContract(),
  eventAnnotationService: eventAnnotationServiceMock,
});

describe('xy_visualization', () => {
  describe('#getDescription', () => {
    function mixedState(...types: SeriesType[]) {
      const state = exampleState();
      return {
        ...state,
        layers: types.map((t, i) => ({
          ...state.layers[0],
          layerId: `layer_${i}`,
          seriesType: t,
        })),
      };
    }

    it('should show mixed xy chart when multiple series types', () => {
      const desc = xyVisualization.getDescription(mixedState('bar', 'line'));

      expect(desc.label).toEqual('Mixed XY');
    });

    it('should show the preferredSeriesType if there are no layers', () => {
      const desc = xyVisualization.getDescription(mixedState());

      expect(desc.icon).toEqual(LensIconChartBar);
      expect(desc.label).toEqual('Bar vertical');
    });

    it('should show mixed horizontal bar chart when multiple horizontal bar types', () => {
      const desc = xyVisualization.getDescription(
        mixedState('bar_horizontal', 'bar_horizontal_stacked')
      );

      expect(desc.label).toEqual('Mixed bar horizontal');
    });

    it('should show bar chart when bar only', () => {
      const desc = xyVisualization.getDescription(mixedState('bar_horizontal', 'bar_horizontal'));

      expect(desc.label).toEqual('Bar horizontal');
    });

    it('should show the chart description if not mixed', () => {
      expect(xyVisualization.getDescription(mixedState('area')).label).toEqual('Area');
      expect(xyVisualization.getDescription(mixedState('line')).label).toEqual('Line');
      expect(xyVisualization.getDescription(mixedState('area_stacked')).label).toEqual(
        'Area stacked'
      );
      expect(xyVisualization.getDescription(mixedState('bar_horizontal_stacked')).label).toEqual(
        'Bar horizontal stacked'
      );
    });
  });

  describe('#getVisualizationTypeId', () => {
    function mixedState(...types: SeriesType[]): XYState {
      const state = exampleState();
      return {
        ...state,
        layers: types.map((t, i) => ({
          ...(state.layers[0] as XYDataLayerConfig),
          layerId: `layer_${i}`,
          seriesType: t,
        })),
      };
    }

    it('should show mixed when each layer is different', () => {
      expect(xyVisualization.getVisualizationTypeId(mixedState('bar', 'line'))).toEqual('mixed');
    });

    it('should show the preferredSeriesType if there are no layers', () => {
      expect(xyVisualization.getVisualizationTypeId(mixedState())).toEqual('bar');
    });

    it('should combine multiple layers into one type', () => {
      expect(
        xyVisualization.getVisualizationTypeId(mixedState('bar_horizontal', 'bar_horizontal'))
      ).toEqual('bar_horizontal');
    });

    it('should return the subtype for single layers', () => {
      expect(xyVisualization.getVisualizationTypeId(mixedState('area'))).toEqual('area');
      expect(xyVisualization.getVisualizationTypeId(mixedState('line'))).toEqual('line');
      expect(xyVisualization.getVisualizationTypeId(mixedState('area_stacked'))).toEqual(
        'area_stacked'
      );
      expect(xyVisualization.getVisualizationTypeId(mixedState('bar_horizontal_stacked'))).toEqual(
        'bar_horizontal_stacked'
      );
    });
  });

  describe('#initialize', () => {
    it('loads default state', () => {
      const initialState = xyVisualization.initialize(() => 'l1');

      expect(initialState.layers).toHaveLength(1);
      expect((initialState.layers[0] as XYDataLayerConfig).xAccessor).not.toBeDefined();
      expect((initialState.layers[0] as XYDataLayerConfig).accessors).toHaveLength(0);

      expect(initialState).toMatchInlineSnapshot(`
        Object {
          "layers": Array [
            Object {
              "accessors": Array [],
              "layerId": "l1",
              "layerType": "data",
              "position": "top",
              "seriesType": "bar_stacked",
              "showGridlines": false,
            },
          ],
          "legend": Object {
            "isVisible": true,
            "position": "right",
          },
          "preferredSeriesType": "bar_stacked",
          "title": "Empty XY chart",
          "valueLabels": "hide",
        }
      `);
    });

    it('loads from persisted state', () => {
      expect(xyVisualization.initialize(() => 'first', exampleState())).toEqual(exampleState());
    });
  });

  describe('#removeLayer', () => {
    it('removes the specified layer', () => {
      const prevState: State = {
        ...exampleState(),
        layers: [
          ...exampleState().layers,
          {
            layerId: 'second',
            layerType: layerTypes.DATA,
            seriesType: 'area',
            splitAccessor: 'e',
            xAccessor: 'f',
            accessors: ['g', 'h'],
          },
        ],
      };

      expect(xyVisualization.removeLayer!(prevState, 'second')).toEqual(exampleState());
    });
  });

  describe('#appendLayer', () => {
    it('adds a layer', () => {
      const layers = xyVisualization.appendLayer!(exampleState(), 'foo', layerTypes.DATA).layers;
      expect(layers.length).toEqual(exampleState().layers.length + 1);
      expect(layers[layers.length - 1]).toMatchObject({ layerId: 'foo' });
    });
  });

  describe('#clearLayer', () => {
    it('clears the specified layer', () => {
      const layer = xyVisualization.clearLayer(exampleState(), 'first').layers[0];
      expect(layer).toMatchObject({
        accessors: [],
        layerId: 'first',
        seriesType: 'bar',
      });
    });
  });

  describe('#getLayerIds', () => {
    it('returns layerids', () => {
      expect(xyVisualization.getLayerIds(exampleState())).toEqual(['first']);
    });
  });

  describe('#getSupportedLayers', () => {
    it('should return a double layer types', () => {
      expect(xyVisualization.getSupportedLayers()).toHaveLength(3);
    });

    it('should return the icon for the visualization type', () => {
      expect(xyVisualization.getSupportedLayers()[0].icon).not.toBeUndefined();
    });
    describe('annotations', () => {
      let mockDatasource: ReturnType<typeof createMockDatasource>;
      let frame: ReturnType<typeof createMockFramePublicAPI>;
      beforeEach(() => {
        frame = createMockFramePublicAPI();
        mockDatasource = createMockDatasource('testDatasource');

        frame.datasourceLayers = {
          first: mockDatasource.publicAPIMock,
        };
        frame.datasourceLayers.first.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'a') {
            return {
              dataType: 'date',
              isBucketed: true,
              scale: 'interval',
              label: 'date_histogram',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        frame.activeData = {
          first: {
            type: 'datatable',
            rows: [],
            columns: [],
          },
        };
      });
      it('when there is no date histogram annotation layer is disabled', () => {
        const supportedAnnotationLayer = xyVisualization
          .getSupportedLayers(exampleState())
          .find((a) => a.type === 'annotations');
        expect(supportedAnnotationLayer?.disabled).toBeTruthy();
      });
      it('for data with date histogram annotation layer is enabled and calculates initial dimensions', () => {
        const supportedAnnotationLayer = xyVisualization
          .getSupportedLayers(exampleState(), frame)
          .find((a) => a.type === 'annotations');
        expect(supportedAnnotationLayer?.disabled).toBeFalsy();
        expect(supportedAnnotationLayer?.noDatasource).toBeTruthy();
        expect(supportedAnnotationLayer?.initialDimensions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ groupId: 'xAnnotations', columnId: expect.any(String) }),
          ])
        );
      });
    });
  });

  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      expect(xyVisualization.getLayerType('first', exampleState())).toEqual(layerTypes.DATA);
      expect(xyVisualization.getLayerType('foo', exampleState())).toBeUndefined();
    });
  });

  describe('#setDimension', () => {
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

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [],
          columns: [],
        },
      };
    });

    it('sets the x axis', () => {
      expect(
        xyVisualization.setDimension({
          frame,
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                xAccessor: undefined,
                accessors: [],
              },
            ],
          },
          layerId: 'first',
          groupId: 'x',
          columnId: 'newCol',
        }).layers[0]
      ).toEqual({
        layerId: 'first',
        layerType: layerTypes.DATA,
        seriesType: 'area',
        xAccessor: 'newCol',
        accessors: [],
      });
    });

    it('replaces the x axis', () => {
      expect(
        xyVisualization.setDimension({
          frame,
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                xAccessor: 'a',
                accessors: [],
              },
            ],
          },
          layerId: 'first',
          groupId: 'x',
          columnId: 'newCol',
        }).layers[0]
      ).toEqual({
        layerId: 'first',
        layerType: layerTypes.DATA,
        seriesType: 'area',
        xAccessor: 'newCol',
        accessors: [],
      });
    });

    it('should add a dimension to a reference layer', () => {
      expect(
        xyVisualization.setDimension({
          frame,
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'referenceLine',
                layerType: layerTypes.REFERENCELINE,
                accessors: [],
              },
            ],
          },
          layerId: 'referenceLine',
          groupId: 'xReferenceLine',
          columnId: 'newCol',
        }).layers[0]
      ).toEqual({
        layerId: 'referenceLine',
        layerType: layerTypes.REFERENCELINE,
        accessors: ['newCol'],
        yConfig: [
          {
            axisMode: 'bottom',
            forAccessor: 'newCol',
          },
        ],
      });
    });

    describe('annotations', () => {
      it('should add a dimension to a annotation layer', () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2022-04-18T11:01:58.135Z').valueOf());
        expect(
          xyVisualization.setDimension({
            frame,
            prevState: {
              ...exampleState(),
              layers: [
                {
                  layerId: 'annotation',
                  layerType: layerTypes.ANNOTATIONS,
                  annotations: [exampleAnnotation],
                },
              ],
            },
            layerId: 'annotation',
            groupId: 'xAnnotation',
            columnId: 'newCol',
          }).layers[0]
        ).toEqual({
          layerId: 'annotation',
          layerType: layerTypes.ANNOTATIONS,
          annotations: [
            exampleAnnotation,
            {
              icon: 'triangle',
              id: 'newCol',
              key: {
                timestamp: '2022-04-18T11:01:58.135Z',
                type: 'point_in_time',
              },
              label: 'Event',
            },
          ],
        });
      });
      it('should copy previous column if passed and assign a new id', () => {
        expect(
          xyVisualization.setDimension({
            frame,
            prevState: {
              ...exampleState(),
              layers: [
                {
                  layerId: 'annotation',
                  layerType: layerTypes.ANNOTATIONS,
                  annotations: [exampleAnnotation2],
                },
              ],
            },
            layerId: 'annotation',
            groupId: 'xAnnotation',
            previousColumn: 'an2',
            columnId: 'newColId',
          }).layers[0]
        ).toEqual({
          layerId: 'annotation',
          layerType: layerTypes.ANNOTATIONS,
          annotations: [exampleAnnotation2, { ...exampleAnnotation2, id: 'newColId' }],
        });
      });
      it('should reorder a dimension to a annotation layer', () => {
        expect(
          xyVisualization.setDimension({
            frame,
            prevState: {
              ...exampleState(),
              layers: [
                {
                  layerId: 'annotation',
                  layerType: layerTypes.ANNOTATIONS,
                  annotations: [exampleAnnotation, exampleAnnotation2],
                },
              ],
            },
            layerId: 'annotation',
            groupId: 'xAnnotation',
            previousColumn: 'an2',
            columnId: 'an1',
          }).layers[0]
        ).toEqual({
          layerId: 'annotation',
          layerType: layerTypes.ANNOTATIONS,
          annotations: [exampleAnnotation2, exampleAnnotation],
        });
      });
    });
  });

  describe('#updateLayersConfigurationFromContext', () => {
    let mockDatasource: ReturnType<typeof createMockDatasource>;
    let frame: ReturnType<typeof createMockFramePublicAPI>;
    let context: VisualizeEditorLayersContext;

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
        { columnId: 'd', fields: [] },
        { columnId: 'a', fields: [] },
        { columnId: 'b', fields: [] },
        { columnId: 'c', fields: [] },
      ]);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [],
          columns: [],
        },
      };

      context = {
        chartType: 'area',
        axisPosition: 'right',
        palette: {
          name: 'temperature',
          type: 'palette',
        },
        metrics: [
          {
            agg: 'count',
            isFullReference: false,
            fieldName: 'document',
            params: {},
            color: '#68BC00',
          },
        ],
        timeInterval: 'auto',
        format: 'bytes',
      } as VisualizeEditorLayersContext;
    });

    it('sets the context configuration correctly', () => {
      const state = xyVisualization?.updateLayersConfigurationFromContext?.({
        prevState: {
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'line',
              xAccessor: undefined,
              accessors: ['a'],
            },
          ],
        },
        layerId: 'first',
        context,
      });
      expect(state?.layers[0]).toHaveProperty('seriesType', 'area');
      expect((state?.layers[0] as XYDataLayerConfig).yConfig).toStrictEqual([
        {
          axisMode: 'right',
          color: '#68BC00',
          forAccessor: 'a',
        },
      ]);

      expect((state?.layers[0] as XYDataLayerConfig).palette).toStrictEqual({
        name: 'temperature',
        type: 'palette',
      });
    });

    it('sets the context configuration correctly for reference lines', () => {
      const newContext = {
        ...context,
        metrics: [
          {
            agg: 'static_value',
            fieldName: 'document',
            isFullReference: true,
            color: '#68BC00',
            params: {
              value: '10',
            },
          },
        ],
      };
      const state = xyVisualization?.updateLayersConfigurationFromContext?.({
        prevState: {
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'line',
              xAccessor: undefined,
              accessors: ['a'],
            },
          ],
        },
        layerId: 'first',
        context: newContext,
      });
      const firstLayer = state?.layers[0] as XYDataLayerConfig;
      expect(firstLayer).toHaveProperty('seriesType', 'area');
      expect(firstLayer).toHaveProperty('layerType', 'referenceLine');
      expect(firstLayer.yConfig).toStrictEqual([
        {
          axisMode: 'right',
          color: '#68BC00',
          forAccessor: 'a',
          fill: 'below',
        },
      ]);
    });
  });

  describe('#getVisualizationSuggestionFromContext', () => {
    let context: VisualizeEditorContext;
    let suggestions: Suggestion[];

    beforeEach(() => {
      suggestions = [
        {
          title: 'Average of AvgTicketPrice over timestamp',
          score: 0.3333333333333333,
          hide: true,
          visualizationId: 'lnsXY',
          visualizationState: {
            legend: {
              isVisible: true,
              position: 'right',
            },
            valueLabels: 'hide',
            fittingFunction: 'None',
            axisTitlesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            tickLabelsVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            labelsOrientation: {
              x: 0,
              yLeft: 0,
              yRight: 0,
            },
            gridlinesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: 'e71c3459-ddcf-4a13-94a1-bf91f7b40175',
                seriesType: 'bar_stacked',
                xAccessor: '911abe51-36ca-42ba-ae4e-bcf3f941f3c1',
                accessors: ['0ffeb3fb-86fd-42d1-ab62-5a00b7000a7b'],
                layerType: 'data',
              },
            ],
          },
          keptLayerIds: [],
          datasourceState: {
            layers: {
              'e71c3459-ddcf-4a13-94a1-bf91f7b40175': {
                indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                columns: {
                  '911abe51-36ca-42ba-ae4e-bcf3f941f3c1': {
                    label: 'timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: 'timestamp',
                    isBucketed: true,
                    scale: 'interval',
                    params: {
                      interval: 'auto',
                    },
                  },
                  '0ffeb3fb-86fd-42d1-ab62-5a00b7000a7b': {
                    label: 'Average of AvgTicketPrice',
                    dataType: 'number',
                    operationType: 'average',
                    sourceField: 'AvgTicketPrice',
                    isBucketed: false,
                    scale: 'ratio',
                  },
                },
                columnOrder: [
                  '911abe51-36ca-42ba-ae4e-bcf3f941f3c1',
                  '0ffeb3fb-86fd-42d1-ab62-5a00b7000a7b',
                ],
                incompleteColumns: {},
              },
            },
          },
          datasourceId: 'indexpattern',
          columns: 2,
          changeType: 'initial',
        },
      ] as unknown as Suggestion[];

      context = {
        layers: [
          {
            indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            timeFieldName: 'order_date',
            chartType: 'area',
            axisPosition: 'left',
            palette: {
              type: 'palette',
              name: 'default',
            },
            metrics: [
              {
                agg: 'count',
                isFullReference: false,
                fieldName: 'document',
                params: {},
                color: '#68BC00',
              },
            ],
            timeInterval: 'auto',
          },
        ],
        type: 'lnsXY',
        configuration: {
          fill: '0.5',
          legend: {
            isVisible: true,
            position: 'right',
            shouldTruncate: true,
            maxLines: true,
          },
          gridLinesVisibility: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          extents: {
            yLeftExtent: {
              mode: 'full',
            },
            yRightExtent: {
              mode: 'full',
            },
          },
        },
        isVisualizeAction: true,
      } as VisualizeEditorContext;
    });

    it('updates the visualization state correctly based on the context', () => {
      const suggestion = xyVisualization?.getVisualizationSuggestionFromContext?.({
        suggestions,
        context,
      }) as XYSuggestion;
      expect(suggestion?.visualizationState?.fillOpacity).toEqual(0.5);
      expect(suggestion?.visualizationState?.yRightExtent).toEqual({ mode: 'full' });
      expect(suggestion?.visualizationState?.legend).toEqual({
        isVisible: true,
        maxLines: true,
        position: 'right',
        shouldTruncate: true,
      });
    });
  });

  describe('#removeDimension', () => {
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

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [],
          columns: [],
        },
      };
    });

    it('removes the x axis', () => {
      expect(
        xyVisualization.removeDimension({
          frame,
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                xAccessor: 'a',
                accessors: [],
              },
            ],
          },
          layerId: 'first',
          columnId: 'a',
        }).layers[0]
      ).toEqual({
        layerId: 'first',
        layerType: layerTypes.DATA,
        seriesType: 'area',
        xAccessor: undefined,
        accessors: [],
      });
    });
    it('removes annotation dimension', () => {
      expect(
        xyVisualization.removeDimension({
          frame,
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                xAccessor: 'a',
                accessors: [],
              },
              {
                layerId: 'ann',
                layerType: layerTypes.ANNOTATIONS,
                annotations: [exampleAnnotation, { ...exampleAnnotation, id: 'an2' }],
              },
            ],
          },
          layerId: 'ann',
          columnId: 'an2',
        }).layers
      ).toEqual([
        {
          layerId: 'first',
          layerType: layerTypes.DATA,
          seriesType: 'area',
          xAccessor: 'a',
          accessors: [],
        },
        {
          layerId: 'ann',
          layerType: layerTypes.ANNOTATIONS,
          annotations: [exampleAnnotation],
        },
      ]);
    });
  });

  describe('#getConfiguration', () => {
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

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      frame.activeData = {
        first: {
          type: 'datatable',
          rows: [],
          columns: [],
        },
      };
    });

    it('should return options for 3 dimensions', () => {
      const options = xyVisualization.getConfiguration({
        state: exampleState(),
        frame,
        layerId: 'first',
      }).groups;
      expect(options).toHaveLength(3);
      expect(options.map((o) => o.groupId)).toEqual(['x', 'y', 'breakdown']);
    });

    it('should return the correct labels for the 3 dimensions', () => {
      const options = xyVisualization.getConfiguration({
        state: exampleState(),
        frame,
        layerId: 'first',
      }).groups;
      expect(options.map((o) => o.groupLabel)).toEqual([
        'Horizontal axis',
        'Vertical axis',
        'Break down by',
      ]);
    });

    it('should return the correct labels for the 3 dimensions for a horizontal chart', () => {
      const initialState = exampleState();
      const state = {
        ...initialState,
        layers: [{ ...initialState.layers[0], seriesType: 'bar_horizontal' as SeriesType }],
      };
      const options = xyVisualization.getConfiguration({
        state,
        frame,
        layerId: 'first',
      }).groups;
      expect(options.map((o) => o.groupLabel)).toEqual([
        'Vertical axis',
        'Horizontal axis',
        'Break down by',
      ]);
    });

    it('should only accept bucketed operations for x', () => {
      const options = xyVisualization.getConfiguration({
        state: exampleState(),
        frame,
        layerId: 'first',
      }).groups;
      const filterOperations = options.find((o) => o.groupId === 'x')!.filterOperations;

      const exampleOperation: Operation = {
        dataType: 'number',
        isBucketed: false,
        label: 'bar',
      };
      const bucketedOps: Operation[] = [
        { ...exampleOperation, isBucketed: true, dataType: 'number' },
        { ...exampleOperation, isBucketed: true, dataType: 'string' },
        { ...exampleOperation, isBucketed: true, dataType: 'boolean' },
        { ...exampleOperation, isBucketed: true, dataType: 'date' },
      ];
      const ops: Operation[] = [
        ...bucketedOps,
        { ...exampleOperation, dataType: 'number' },
        { ...exampleOperation, dataType: 'string' },
        { ...exampleOperation, dataType: 'boolean' },
        { ...exampleOperation, dataType: 'date' },
      ];
      expect(ops.filter(filterOperations)).toEqual(bucketedOps);
    });

    it('should not allow anything to be added to x', () => {
      const options = xyVisualization.getConfiguration({
        state: exampleState(),
        frame,
        layerId: 'first',
      }).groups;
      expect(options.find((o) => o.groupId === 'x')?.supportsMoreColumns).toBe(false);
    });

    it('should allow number operations on y', () => {
      const options = xyVisualization.getConfiguration({
        state: exampleState(),
        frame,
        layerId: 'first',
      }).groups;
      const filterOperations = options.find((o) => o.groupId === 'y')!.filterOperations;
      const exampleOperation: Operation = {
        dataType: 'number',
        isBucketed: false,
        label: 'bar',
      };
      const ops: Operation[] = [
        { ...exampleOperation, dataType: 'number' },
        { ...exampleOperation, dataType: 'string' },
        { ...exampleOperation, dataType: 'boolean' },
        { ...exampleOperation, dataType: 'date' },
      ];
      expect(ops.filter(filterOperations).map((x) => x.dataType)).toEqual(['number']);
    });

    describe('breakdown group: percentage chart checks', () => {
      const baseState = exampleState();

      it('should require break down group with one accessor + one split accessor configuration', () => {
        const [, , splitGroup] = xyVisualization.getConfiguration({
          state: {
            ...baseState,
            layers: [
              {
                ...baseState.layers[0],
                accessors: ['a'],
                seriesType: 'bar_percentage_stacked',
              } as XYLayerConfig,
            ],
          },
          frame,
          layerId: 'first',
        }).groups;
        expect(splitGroup.required).toBe(true);
      });

      test.each([
        [
          'multiple accessors on the same layer',
          [
            {
              ...baseState.layers[0],
              splitAccessor: undefined,
              seriesType: 'bar_percentage_stacked',
            },
          ],
        ],
        [
          'multiple accessors spread on compatible layers',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              splitAccessor: undefined,
              seriesType: 'bar_percentage_stacked',
            },
            {
              ...baseState.layers[0],
              splitAccessor: undefined,
              xAccessor: 'd',
              accessors: ['e'],
              seriesType: 'bar_percentage_stacked',
            },
          ],
        ],
      ] as Array<[string, State['layers']]>)(
        'should not require break down group for %s',
        (_, layers) => {
          const [, , splitGroup] = xyVisualization.getConfiguration({
            state: { ...baseState, layers },
            frame,
            layerId: 'first',
          }).groups;
          expect(splitGroup.required).toBe(false);
        }
      );

      it.each([
        [
          'one accessor only',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
              splitAccessor: undefined,
              xAccessor: undefined,
            },
          ],
        ],
        [
          'one accessor only with split accessor',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
              xAccessor: undefined,
            },
          ],
        ],
        [
          'one accessor only with xAccessor',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
              splitAccessor: undefined,
            },
          ],
        ],
        [
          'multiple accessors spread on incompatible layers (different xAccessor)',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
              splitAccessor: undefined,
            },
            {
              ...baseState.layers[0],
              accessors: ['e'],
              seriesType: 'bar_percentage_stacked',
              splitAccessor: undefined,
              xAccessor: undefined,
            },
          ],
        ],
        [
          'multiple accessors spread on incompatible layers (different splitAccessor)',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
            },
            {
              ...baseState.layers[0],
              accessors: ['e'],
              seriesType: 'bar_percentage_stacked',
              splitAccessor: undefined,
              xAccessor: undefined,
            },
          ],
        ],
        [
          'multiple accessors spread on incompatible layers (different seriesType)',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
            },
            {
              ...baseState.layers[0],
              accessors: ['e'],
              seriesType: 'bar',
            },
          ],
        ],
        [
          'one data layer with one accessor + one reference layer',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              seriesType: 'bar_percentage_stacked',
            },
            {
              ...baseState.layers[0],
              accessors: ['e'],
              seriesType: 'bar_percentage_stacked',
              layerType: layerTypes.REFERENCELINE,
            },
          ],
        ],

        [
          'multiple accessors on the same layers with different axis assigned',
          [
            {
              ...baseState.layers[0],
              splitAccessor: undefined,
              seriesType: 'bar_percentage_stacked',
              yConfig: [
                { forAccessor: 'a', axisMode: 'left' },
                { forAccessor: 'b', axisMode: 'right' },
              ],
            },
          ],
        ],
        [
          'multiple accessors spread on multiple layers with different axis assigned',
          [
            {
              ...baseState.layers[0],
              accessors: ['a'],
              xAccessor: undefined,
              splitAccessor: undefined,
              seriesType: 'bar_percentage_stacked',
              yConfig: [{ forAccessor: 'a', axisMode: 'left' }],
            },
            {
              ...baseState.layers[0],
              accessors: ['b'],
              xAccessor: undefined,
              splitAccessor: undefined,
              seriesType: 'bar_percentage_stacked',
              yConfig: [{ forAccessor: 'b', axisMode: 'right' }],
            },
          ],
        ],
      ] as Array<[string, State['layers']]>)(
        'should require break down group for %s',
        (_, layers) => {
          const [, , splitGroup] = xyVisualization.getConfiguration({
            state: { ...baseState, layers },
            frame,
            layerId: 'first',
          }).groups;
          expect(splitGroup.required).toBe(true);
        }
      );
    });

    describe('reference lines', () => {
      beforeEach(() => {
        frame.datasourceLayers = {
          first: mockDatasource.publicAPIMock,
          referenceLine: mockDatasource.publicAPIMock,
        };
      });

      function getStateWithBaseReferenceLine(): State {
        return {
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              splitAccessor: undefined,
              xAccessor: undefined,
              accessors: ['a'],
            },
            {
              layerId: 'referenceLine',
              layerType: layerTypes.REFERENCELINE,
              accessors: [],
              yConfig: [{ axisMode: 'left', forAccessor: 'a' }],
            },
          ],
        };
      }

      it('should support static value', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[1] as XYReferenceLineLayerConfig).accessors = [];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig = undefined;
        expect(
          xyVisualization.getConfiguration({
            state: getStateWithBaseReferenceLine(),
            frame,
            layerId: 'referenceLine',
          }).groups[0].supportStaticValue
        ).toBeTruthy();
      });

      it('should return no referenceLine groups for a empty data layer', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).accessors = [];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig = undefined;

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options).toHaveLength(0);
      });

      it('should return a group for the vertical left axis', () => {
        const options = xyVisualization.getConfiguration({
          state: getStateWithBaseReferenceLine(),
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options).toHaveLength(1);
        expect(options[0].groupId).toBe('yReferenceLineLeft');
      });

      it('should return a group for the vertical right axis', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).yConfig = [{ axisMode: 'right', forAccessor: 'a' }];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig![0].axisMode = 'right';

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options).toHaveLength(1);
        expect(options[0].groupId).toBe('yReferenceLineRight');
      });

      it('should compute no groups for referenceLines when the only data accessor available is a date histogram', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).xAccessor = 'b';
        (state.layers[0] as XYDataLayerConfig).accessors = [];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig = []; // empty the configuration
        // set the xAccessor as date_histogram
        frame.datasourceLayers.referenceLine.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'b') {
            return {
              dataType: 'date',
              isBucketed: true,
              scale: 'interval',
              label: 'date_histogram',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options).toHaveLength(0);
      });

      it('should mark horizontal group is invalid when xAccessor is changed to a date histogram', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).xAccessor = 'b';
        (state.layers[0] as XYDataLayerConfig).accessors = [];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig![0].axisMode = 'bottom';
        // set the xAccessor as date_histogram
        frame.datasourceLayers.referenceLine.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'b') {
            return {
              dataType: 'date',
              isBucketed: true,
              scale: 'interval',
              label: 'date_histogram',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options[0]).toEqual(
          expect.objectContaining({
            invalid: true,
            groupId: 'xReferenceLine',
          })
        );
      });

      it('should return groups in a specific order (left, right, bottom)', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).xAccessor = 'c';
        (state.layers[0] as XYDataLayerConfig).accessors = ['a', 'b'];
        // invert them on purpose
        (state.layers[0] as XYDataLayerConfig).yConfig = [
          { axisMode: 'right', forAccessor: 'b' },
          { axisMode: 'left', forAccessor: 'a' },
        ];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig = [
          { forAccessor: 'c', axisMode: 'bottom' },
          { forAccessor: 'b', axisMode: 'right' },
          { forAccessor: 'a', axisMode: 'left' },
        ];
        // set the xAccessor as number histogram
        frame.datasourceLayers.referenceLine.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'c') {
            return {
              dataType: 'number',
              isBucketed: true,
              scale: 'interval',
              label: 'histogram',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        const [left, right, bottom] = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(left.groupId).toBe('yReferenceLineLeft');
        expect(right.groupId).toBe('yReferenceLineRight');
        expect(bottom.groupId).toBe('xReferenceLine');
      });

      it('should ignore terms operation for xAccessor', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).xAccessor = 'b';
        (state.layers[0] as XYDataLayerConfig).accessors = [];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig = []; // empty the configuration
        // set the xAccessor as top values
        frame.datasourceLayers.referenceLine.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'b') {
            return {
              dataType: 'string',
              isBucketed: true,
              scale: 'ordinal',
              label: 'top values',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options).toHaveLength(0);
      });

      it('should mark horizontal group is invalid when accessor is changed to a terms operation', () => {
        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).xAccessor = 'b';
        (state.layers[0] as XYDataLayerConfig).accessors = [];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig![0].axisMode = 'bottom';
        // set the xAccessor as date_histogram
        frame.datasourceLayers.referenceLine.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'b') {
            return {
              dataType: 'string',
              isBucketed: true,
              scale: 'ordinal',
              label: 'top values',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;

        expect(options[0]).toEqual(
          expect.objectContaining({
            invalid: true,
            groupId: 'xReferenceLine',
          })
        );
      });

      it('differ vertical axis if the formatters are not compatibles between each other', () => {
        const tables: Record<string, Datatable> = {
          first: {
            type: 'datatable',
            rows: [],
            columns: [
              {
                id: 'xAccessorId',
                name: 'horizontal axis',
                meta: {
                  type: 'date',
                  params: { params: { id: 'date', params: { pattern: 'HH:mm' } } },
                },
              },
              {
                id: 'yAccessorId',
                name: 'left axis',
                meta: {
                  type: 'number',
                  params: { id: 'number' },
                },
              },
              {
                id: 'yAccessorId2',
                name: 'right axis',
                meta: {
                  type: 'number',
                  params: { id: 'bytes' },
                },
              },
            ],
          },
        };

        const state = getStateWithBaseReferenceLine();
        (state.layers[0] as XYDataLayerConfig).accessors = ['yAccessorId', 'yAccessorId2'];
        (state.layers[1] as XYReferenceLineLayerConfig).yConfig = []; // empty the configuration

        const options = xyVisualization.getConfiguration({
          state,
          frame: { ...frame, activeData: tables },
          layerId: 'referenceLine',
        }).groups;

        expect(options).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ groupId: 'yReferenceLineLeft' }),
            expect.objectContaining({ groupId: 'yReferenceLineRight' }),
          ])
        );
      });

      it('should be excluded and not crash when a custom palette is used for data layer', () => {
        const state = getStateWithBaseReferenceLine();
        // now add a breakdown on the data layer with a custom palette
        (state.layers[0] as XYDataLayerConfig).palette = {
          type: 'palette',
          name: 'custom',
          params: {},
        };
        (state.layers[0] as XYDataLayerConfig).splitAccessor = 'd';

        const options = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'referenceLine',
        }).groups;
        // it should not crash basically
        expect(options).toHaveLength(1);
      });
    });

    describe('annotations', () => {
      beforeEach(() => {
        frame = createMockFramePublicAPI();
        mockDatasource = createMockDatasource('testDatasource');

        frame.datasourceLayers = {
          first: mockDatasource.publicAPIMock,
        };
        frame.datasourceLayers.first.getOperationForColumnId = jest.fn((accessor) => {
          if (accessor === 'a') {
            return {
              dataType: 'date',
              isBucketed: true,
              scale: 'interval',
              label: 'date_histogram',
              isStaticValue: false,
              hasTimeShift: false,
            };
          }
          return null;
        });

        frame.activeData = {
          first: {
            type: 'datatable',
            rows: [],
            columns: [],
          },
        };
      });

      function getStateWithAnnotationLayer(): State {
        return {
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              splitAccessor: undefined,
              xAccessor: 'a',
              accessors: ['b'],
            },
            {
              layerId: 'annotations',
              layerType: layerTypes.ANNOTATIONS,
              annotations: [exampleAnnotation],
            },
          ],
        };
      }

      it('returns configuration correctly', () => {
        const state = getStateWithAnnotationLayer();
        const config = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'annotations',
        });
        expect(config.groups[0].accessors).toEqual([
          { color: '#f04e98', columnId: 'an1', triggerIcon: 'color' },
        ]);
        expect(config.groups[0].invalid).toEqual(false);
      });

      it('When data layer is empty, should return invalid state', () => {
        const state = getStateWithAnnotationLayer();
        (state.layers[0] as XYDataLayerConfig).xAccessor = undefined;
        const config = xyVisualization.getConfiguration({
          state,
          frame,
          layerId: 'annotations',
        });
        expect(config.groups[0].invalid).toEqual(true);
      });
    });

    describe('color assignment', () => {
      function callConfig(layerConfigOverride: Partial<XYLayerConfig>) {
        const baseState = exampleState();
        const options = xyVisualization.getConfiguration({
          state: {
            ...baseState,
            layers: [
              {
                ...baseState.layers[0],
                splitAccessor: undefined,
                ...layerConfigOverride,
              } as XYLayerConfig,
            ],
          },
          frame,
          layerId: 'first',
        }).groups;
        return options;
      }

      function callConfigForYConfigs(layerConfigOverride: Partial<XYLayerConfig>) {
        return callConfig(layerConfigOverride).find(({ groupId }) => groupId === 'y');
      }

      function callConfigForBreakdownConfigs(layerConfigOverride: Partial<XYLayerConfig>) {
        return callConfig(layerConfigOverride).find(({ groupId }) => groupId === 'breakdown');
      }

      function callConfigAndFindYConfig(
        layerConfigOverride: Partial<XYLayerConfig>,
        assertionAccessor: string
      ) {
        const accessorConfig = callConfigForYConfigs(layerConfigOverride)?.accessors.find(
          (accessor) => typeof accessor !== 'string' && accessor.columnId === assertionAccessor
        );
        if (!accessorConfig || typeof accessorConfig === 'string') {
          throw new Error('could not find accessor');
        }
        return accessorConfig;
      }

      it('should pass custom y color in accessor config', () => {
        const accessorConfig = callConfigAndFindYConfig(
          {
            yConfig: [
              {
                forAccessor: 'b',
                color: 'red',
              },
            ],
          },
          'b'
        );
        expect(accessorConfig.triggerIcon).toEqual('color');
        expect(accessorConfig.color).toEqual('red');
      });

      it('should query palette to fill in colors for other dimensions', () => {
        const palette = paletteServiceMock.get('default');
        (palette.getCategoricalColor as jest.Mock).mockClear();
        const accessorConfig = callConfigAndFindYConfig({}, 'c');
        expect(accessorConfig.triggerIcon).toEqual('color');
        // black is the color returned from the palette mock
        expect(accessorConfig.color).toEqual('black');
        expect(palette.getCategoricalColor).toHaveBeenCalledWith(
          [
            {
              name: 'c',
              // rank 1 because it's the second y metric
              rankAtDepth: 1,
              totalSeriesAtDepth: 2,
            },
          ],
          { maxDepth: 1, totalSeries: 2 },
          undefined
        );
      });

      it('should pass name of current series along', () => {
        (frame.datasourceLayers.first.getOperationForColumnId as jest.Mock).mockReturnValue({
          label: 'Overwritten label',
        });
        const palette = paletteServiceMock.get('default');
        (palette.getCategoricalColor as jest.Mock).mockClear();
        callConfigAndFindYConfig({}, 'c');
        expect(palette.getCategoricalColor).toHaveBeenCalledWith(
          [
            expect.objectContaining({
              name: 'Overwritten label',
            }),
          ],
          expect.anything(),
          undefined
        );
      });

      it('should use custom palette if layer contains palette', () => {
        const palette = paletteServiceMock.get('mock');
        callConfigAndFindYConfig(
          {
            palette: { type: 'palette', name: 'mock', params: {} },
          },
          'c'
        );
        expect(palette.getCategoricalColor).toHaveBeenCalled();
      });

      it('should not show any indicator as long as there is no data', () => {
        frame.activeData = undefined;
        const yConfigs = callConfigForYConfigs({});
        expect(yConfigs!.accessors.length).toEqual(2);
        yConfigs!.accessors.forEach((accessor) => {
          expect(accessor.triggerIcon).toBeUndefined();
        });
      });

      it('should show disable icon for splitted series', () => {
        const accessorConfig = callConfigAndFindYConfig(
          {
            splitAccessor: 'd',
          },
          'b'
        );
        expect(accessorConfig.triggerIcon).toEqual('disabled');
      });

      it('should show current palette for break down by dimension', () => {
        const palette = paletteServiceMock.get('mock');
        const customColors = ['yellow', 'green'];
        (palette.getCategoricalColors as jest.Mock).mockReturnValue(customColors);
        const breakdownConfig = callConfigForBreakdownConfigs({
          palette: { type: 'palette', name: 'mock', params: {} },
          splitAccessor: 'd',
        });
        const accessorConfig = breakdownConfig!.accessors[0];
        expect(typeof accessorConfig !== 'string' && accessorConfig.palette).toEqual(customColors);
      });

      it('should respect the order of accessors coming from datasource', () => {
        mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
          { columnId: 'c', fields: [] },
          { columnId: 'b', fields: [] },
        ]);
        const paletteGetter = jest.spyOn(paletteServiceMock, 'get');
        // overrite palette with a palette returning first blue, then green as color
        paletteGetter.mockReturnValue({
          id: 'default',
          title: '',
          getCategoricalColors: jest.fn(),
          toExpression: jest.fn(),
          getCategoricalColor: jest.fn().mockReturnValueOnce('blue').mockReturnValueOnce('green'),
        });

        const yConfigs = callConfigForYConfigs({});
        expect(yConfigs?.accessors[0].columnId).toEqual('c');
        expect(yConfigs?.accessors[0].color).toEqual('blue');
        expect(yConfigs?.accessors[1].columnId).toEqual('b');
        expect(yConfigs?.accessors[1].color).toEqual('green');

        paletteGetter.mockClear();
      });
    });
  });

  describe('#getErrorMessages', () => {
    let mockDatasource: ReturnType<typeof createMockDatasource>;
    let frame: ReturnType<typeof createMockFramePublicAPI>;

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDatasource = createMockDatasource('testDatasource');

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    it("should not return an error when there's only one dimension (X or Y)", () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
          ],
        })
      ).not.toBeDefined();
    });
    it("should not return an error when there's only one dimension on multiple layers (same axis everywhere)", () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
            {
              layerId: 'second',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
          ],
        })
      ).not.toBeDefined();
    });
    it('should not return an error when mixing different valid configurations in multiple layers', () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
            {
              layerId: 'second',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: ['a'],
              splitAccessor: 'a',
            },
          ],
        })
      ).not.toBeDefined();
    });
    it("should not return an error when there's only one splitAccessor dimension configured", () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
          ],
        })
      ).not.toBeDefined();

      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
            {
              layerId: 'second',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
          ],
        })
      ).not.toBeDefined();
    });
    it('should return an error when there are multiple layers, one axis configured for each layer (but different axis from each other)', () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
            {
              layerId: 'second',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: ['a'],
            },
          ],
        })
      ).toEqual([
        {
          shortMessage: 'Missing Vertical axis.',
          longMessage: 'Layer 1 requires a field for the Vertical axis.',
        },
      ]);
    });
    it('should return an error with batched messages for the same error with multiple layers', () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
            {
              layerId: 'second',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
            {
              layerId: 'third',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
          ],
        })
      ).toEqual([
        {
          shortMessage: 'Missing Vertical axis.',
          longMessage: 'Layers 2, 3 require a field for the Vertical axis.',
        },
      ]);
    });
    it("should return an error when some layers are complete but other layers aren't", () => {
      expect(
        xyVisualization.getErrorMessages({
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
            {
              layerId: 'second',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
            {
              layerId: 'third',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
          ],
        })
      ).toEqual([
        {
          shortMessage: 'Missing Vertical axis.',
          longMessage: 'Layer 1 requires a field for the Vertical axis.',
        },
      ]);
    });

    it('should return an error when accessor type is of the wrong type', () => {
      expect(
        xyVisualization.getErrorMessages(
          {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'a',
                accessors: ['b'], // just use a single accessor to avoid too much noise
              },
            ],
          },
          frame.datasourceLayers
        )
      ).toEqual([
        {
          shortMessage: 'Wrong data type for Vertical axis.',
          longMessage:
            'The dimension MyOperation provided for the Vertical axis has the wrong data type. Expected number but have string',
        },
      ]);
    });

    it('should return an error if two incompatible xAccessors (multiple layers) are used', () => {
      // current incompatibility is only for date and numeric histograms as xAccessors
      const datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: createMockDatasource('testDatasource').publicAPIMock,
      };
      datasourceLayers.first.getOperationForColumnId = jest.fn((id: string) =>
        id === 'a'
          ? ({
              dataType: 'date',
              scale: 'interval',
            } as unknown as OperationDescriptor)
          : null
      );
      datasourceLayers.second.getOperationForColumnId = jest.fn((id: string) =>
        id === 'e'
          ? ({
              dataType: 'number',
              scale: 'interval',
            } as unknown as OperationDescriptor)
          : null
      );
      expect(
        xyVisualization.getErrorMessages(
          {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'a',
                accessors: ['b'],
              },
              {
                layerId: 'second',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'e',
                accessors: ['b'],
              },
            ],
          },
          datasourceLayers
        )
      ).toEqual([
        {
          shortMessage: 'Wrong data type for Horizontal axis.',
          longMessage:
            'Data type mismatch for the Horizontal axis. Cannot mix date and number interval types.',
        },
      ]);
    });

    it('should return an error if string and date histogram xAccessors (multiple layers) are used together', () => {
      // current incompatibility is only for date and numeric histograms as xAccessors
      const datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: createMockDatasource('testDatasource').publicAPIMock,
      };
      datasourceLayers.first.getOperationForColumnId = jest.fn((id: string) =>
        id === 'a'
          ? ({
              dataType: 'date',
              scale: 'interval',
            } as unknown as OperationDescriptor)
          : null
      );
      datasourceLayers.second.getOperationForColumnId = jest.fn((id: string) =>
        id === 'e'
          ? ({
              dataType: 'string',
              scale: 'ordinal',
            } as unknown as OperationDescriptor)
          : null
      );
      expect(
        xyVisualization.getErrorMessages(
          {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'a',
                accessors: ['b'],
              },
              {
                layerId: 'second',
                layerType: layerTypes.DATA,
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'e',
                accessors: ['b'],
              },
            ],
          },
          datasourceLayers
        )
      ).toEqual([
        {
          shortMessage: 'Wrong data type for Horizontal axis.',
          longMessage: 'Data type mismatch for the Horizontal axis, use a different function.',
        },
      ]);
    });
  });

  describe('#getWarningMessages', () => {
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

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };

      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [
            { id: 'a', name: 'A', meta: { type: 'number' } },
            { id: 'b', name: 'B', meta: { type: 'number' } },
          ],
          rows: [
            { a: 1, b: [2, 0] },
            { a: 3, b: 4 },
            { a: 5, b: 6 },
            { a: 7, b: 8 },
          ],
        },
      };
    });
    it('should return a warning when numeric accessors contain array', () => {
      (frame.datasourceLayers.first.getOperationForColumnId as jest.Mock).mockReturnValue({
        label: 'Label B',
      });
      const warningMessages = xyVisualization.getWarningMessages!(
        {
          ...exampleState(),
          layers: [
            {
              layerId: 'first',
              layerType: layerTypes.DATA,
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['b'],
            },
          ],
        },
        frame
      );
      expect(warningMessages).toHaveLength(1);
      expect(warningMessages && warningMessages[0]).toMatchInlineSnapshot(`
        <FormattedMessage
          defaultMessage="{label} contains array values. Your visualization may not render as expected."
          id="xpack.lens.xyVisualization.arrayValues"
          values={
            Object {
              "label": <strong>
                Label B
              </strong>,
            }
          }
        />
      `);
    });
  });
  describe('#getUniqueLabels', () => {
    it('creates unique labels for single annotations layer with repeating labels', async () => {
      const xyState = {
        layers: [
          {
            layerId: 'layerId',
            layerType: 'annotations',
            annotations: [
              {
                label: 'Event',
                id: '1',
              },
              {
                label: 'Event',
                id: '2',
              },
              {
                label: 'Custom',
                id: '3',
              },
            ],
          },
        ],
      } as XYState;

      expect(xyVisualization.getUniqueLabels!(xyState)).toEqual({
        '1': 'Event',
        '2': 'Event [1]',
        '3': 'Custom',
      });
    });
    it('creates unique labels for multiple annotations layers with repeating labels', async () => {
      const xyState = {
        layers: [
          {
            layerId: 'layer1',
            layerType: 'annotations',
            annotations: [
              {
                label: 'Event',
                id: '1',
              },
              {
                label: 'Event',
                id: '2',
              },
              {
                label: 'Custom',
                id: '3',
              },
            ],
          },
          {
            layerId: 'layer2',
            layerType: 'annotations',
            annotations: [
              {
                label: 'Event',
                id: '4',
              },
              {
                label: 'Event [1]',
                id: '5',
              },
              {
                label: 'Custom',
                id: '6',
              },
            ],
          },
        ],
      } as XYState;

      expect(xyVisualization.getUniqueLabels!(xyState)).toEqual({
        '1': 'Event',
        '2': 'Event [1]',
        '3': 'Custom',
        '4': 'Event [2]',
        '5': 'Event [1] [1]',
        '6': 'Custom [1]',
      });
    });
  });
});
