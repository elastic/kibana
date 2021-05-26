/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getXyVisualization } from './visualization';
import { Position } from '@elastic/charts';
import { Operation } from '../types';
import { State, SeriesType, XYLayerConfig } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';
import { LensIconChartBar } from '../assets/chart_bar';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';

function exampleState(): State {
  return {
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
  };
}
const paletteServiceMock = chartPluginMock.createPaletteRegistry();
const dataMock = dataPluginMock.createStartContract();

const xyVisualization = getXyVisualization({
  paletteService: paletteServiceMock,
  data: dataMock,
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

    it('should show mixed xy chart when multilple series types', () => {
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
      const mockFrame = createMockFramePublicAPI();
      const initialState = xyVisualization.initialize(mockFrame);

      expect(initialState.layers).toHaveLength(1);
      expect(initialState.layers[0].xAccessor).not.toBeDefined();
      expect(initialState.layers[0].accessors).toHaveLength(0);

      expect(initialState).toMatchInlineSnapshot(`
        Object {
          "layers": Array [
            Object {
              "accessors": Array [],
              "layerId": "",
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
      expect(xyVisualization.initialize(createMockFramePublicAPI(), exampleState())).toEqual(
        exampleState()
      );
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
      const layers = xyVisualization.appendLayer!(exampleState(), 'foo').layers;
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

  describe('#setDimension', () => {
    it('sets the x axis', () => {
      expect(
        xyVisualization.setDimension({
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
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
        seriesType: 'area',
        xAccessor: 'newCol',
        accessors: [],
      });
    });

    it('replaces the x axis', () => {
      expect(
        xyVisualization.setDimension({
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
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
        seriesType: 'area',
        xAccessor: 'newCol',
        accessors: [],
      });
    });
  });

  describe('#removeDimension', () => {
    it('removes the x axis', () => {
      expect(
        xyVisualization.removeDimension({
          prevState: {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
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
        seriesType: 'area',
        xAccessor: undefined,
        accessors: [],
      });
    });
  });

  describe('#getConfiguration', () => {
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

    it('should return the correct labels for the 3 dimensios', () => {
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

    it('should return the correct labels for the 3 dimensios for a horizontal chart', () => {
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
              },
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
        (palette.getColor as jest.Mock).mockClear();
        const accessorConfig = callConfigAndFindYConfig({}, 'c');
        expect(accessorConfig.triggerIcon).toEqual('color');
        // black is the color returned from the palette mock
        expect(accessorConfig.color).toEqual('black');
        expect(palette.getColor).toHaveBeenCalledWith(
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
        (palette.getColor as jest.Mock).mockClear();
        callConfigAndFindYConfig({}, 'c');
        expect(palette.getColor).toHaveBeenCalledWith(
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
        expect(palette.getColor).toHaveBeenCalled();
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
        (palette.getColors as jest.Mock).mockReturnValue(customColors);
        const breakdownConfig = callConfigForBreakdownConfigs({
          palette: { type: 'palette', name: 'mock', params: {} },
          splitAccessor: 'd',
        });
        const accessorConfig = breakdownConfig!.accessors[0];
        expect(typeof accessorConfig !== 'string' && accessorConfig.palette).toEqual(customColors);
      });

      it('should respect the order of accessors coming from datasource', () => {
        mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
          { columnId: 'c' },
          { columnId: 'b' },
        ]);
        const paletteGetter = jest.spyOn(paletteServiceMock, 'get');
        // overrite palette with a palette returning first blue, then green as color
        paletteGetter.mockReturnValue({
          id: 'default',
          title: '',
          getColors: jest.fn(),
          toExpression: jest.fn(),
          getColor: jest.fn().mockReturnValueOnce('blue').mockReturnValueOnce('green'),
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
      } as Operation);

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
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
            {
              layerId: 'second',
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
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
            {
              layerId: 'second',
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
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
            {
              layerId: 'second',
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
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
            {
              layerId: 'second',
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
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
            {
              layerId: 'second',
              seriesType: 'area',
              xAccessor: undefined,
              accessors: [],
              splitAccessor: 'a',
            },
            {
              layerId: 'third',
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
              seriesType: 'area',
              xAccessor: 'a',
              accessors: [],
            },
            {
              layerId: 'second',
              seriesType: 'area',
              xAccessor: 'a',
              accessors: ['a'],
            },
            {
              layerId: 'third',
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
          ? (({
              dataType: 'date',
              scale: 'interval',
            } as unknown) as Operation)
          : null
      );
      datasourceLayers.second.getOperationForColumnId = jest.fn((id: string) =>
        id === 'e'
          ? (({
              dataType: 'number',
              scale: 'interval',
            } as unknown) as Operation)
          : null
      );
      expect(
        xyVisualization.getErrorMessages(
          {
            ...exampleState(),
            layers: [
              {
                layerId: 'first',
                seriesType: 'area',
                splitAccessor: 'd',
                xAccessor: 'a',
                accessors: ['b'],
              },
              {
                layerId: 'second',
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
  });

  describe('#getWarningMessages', () => {
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
        <React.Fragment>
          <strong>
            Label B
          </strong>
           contains array values. Your visualization may not render as expected.
        </React.Fragment>
      `);
    });
  });
});
