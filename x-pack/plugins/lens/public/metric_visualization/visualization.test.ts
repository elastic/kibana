/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricVisualization } from './visualization';
import { MetricState } from '../../common/expressions';
import { layerTypes } from '../../common';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import { generateId } from '../id_generator';
import { DatasourcePublicAPI, FramePublicAPI } from '../types';

jest.mock('../id_generator');

function exampleState(): MetricState {
  return {
    accessor: 'a',
    layerId: 'l1',
    layerType: layerTypes.DATA,
  };
}

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    datasourceLayers: {
      l1: createMockDatasource('l1').publicAPIMock,
      l42: createMockDatasource('l42').publicAPIMock,
    },
  };
}

describe('metric_visualization', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      (generateId as jest.Mock).mockReturnValueOnce('test-id1');
      const initialState = metricVisualization.initialize(() => 'test-id1');

      expect(initialState.accessor).not.toBeDefined();
      expect(initialState).toMatchInlineSnapshot(`
        Object {
          "accessor": undefined,
          "layerId": "test-id1",
          "layerType": "data",
        }
      `);
    });

    it('loads from persisted state', () => {
      expect(metricVisualization.initialize(() => 'l1', exampleState())).toEqual(exampleState());
    });
  });

  describe('#getLayerIds', () => {
    it('returns the layer id', () => {
      expect(metricVisualization.getLayerIds(exampleState())).toEqual(['l1']);
    });
  });

  describe('#clearLayer', () => {
    it('returns a clean layer', () => {
      (generateId as jest.Mock).mockReturnValueOnce('test-id1');
      expect(metricVisualization.clearLayer(exampleState(), 'l1')).toEqual({
        accessor: undefined,
        layerId: 'l1',
        layerType: layerTypes.DATA,
      });
    });
  });

  describe('#getConfiguration', () => {
    it('can add a metric when there is no accessor', () => {
      expect(
        metricVisualization.getConfiguration({
          state: {
            accessor: undefined,
            layerId: 'l1',
            layerType: layerTypes.DATA,
          },
          layerId: 'l1',
          frame: mockFrame(),
        })
      ).toEqual({
        groups: [
          expect.objectContaining({
            supportsMoreColumns: true,
          }),
        ],
      });
    });

    it('is not allowed to add a metric once one accessor is set', () => {
      expect(
        metricVisualization.getConfiguration({
          state: {
            accessor: 'a',
            layerId: 'l1',
            layerType: layerTypes.DATA,
          },
          layerId: 'l1',
          frame: mockFrame(),
        })
      ).toEqual({
        groups: [
          expect.objectContaining({
            supportsMoreColumns: false,
          }),
        ],
      });
    });
  });

  describe('#setDimension', () => {
    it('sets the accessor', () => {
      expect(
        metricVisualization.setDimension({
          prevState: {
            accessor: undefined,
            layerId: 'l1',
            layerType: layerTypes.DATA,
          },
          layerId: 'l1',
          groupId: '',
          columnId: 'newDimension',
          frame: mockFrame(),
        })
      ).toEqual({
        accessor: 'newDimension',
        layerId: 'l1',
        layerType: layerTypes.DATA,
      });
    });
  });

  describe('#removeDimension', () => {
    it('removes the accessor', () => {
      expect(
        metricVisualization.removeDimension({
          prevState: {
            accessor: 'a',
            layerId: 'l1',
            layerType: layerTypes.DATA,
          },
          layerId: 'l1',
          columnId: 'a',
          frame: mockFrame(),
        })
      ).toEqual({
        accessor: undefined,
        layerId: 'l1',
        layerType: layerTypes.DATA,
      });
    });
  });

  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(metricVisualization.getSupportedLayers()).toHaveLength(1);
    });
  });

  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      expect(metricVisualization.getLayerType('l1', exampleState())).toEqual(layerTypes.DATA);
      expect(metricVisualization.getLayerType('foo', exampleState())).toBeUndefined();
    });
  });

  describe('#toExpression', () => {
    it('should map to a valid AST', () => {
      const datasource: DatasourcePublicAPI = {
        ...createMockDatasource('l1').publicAPIMock,
        getOperationForColumnId(_: string) {
          return {
            id: 'a',
            dataType: 'number',
            isBucketed: false,
            label: 'shazm',
          };
        },
      };

      const frame = {
        ...mockFrame(),
        datasourceLayers: { l1: datasource },
      };

      expect(metricVisualization.toExpression(exampleState(), frame.datasourceLayers))
        .toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "accessor": Array [
                  "a",
                ],
                "description": Array [
                  "",
                ],
                "metricTitle": Array [
                  "shazm",
                ],
                "mode": Array [
                  "full",
                ],
                "title": Array [
                  "",
                ],
              },
              "function": "lens_metric_chart",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });
  });

  describe('#getErrorMessages', () => {
    it('returns undefined if no error is raised', () => {
      const error = metricVisualization.getErrorMessages(exampleState());

      expect(error).not.toBeDefined();
    });
  });
});
