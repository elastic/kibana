/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricVisualization } from './metric_visualization';
import { State } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';
import { generateId } from '../id_generator';
import { DatasourcePublicAPI, FramePublicAPI } from '../types';

jest.mock('../id_generator');

function exampleState(): State {
  return {
    accessor: 'a',
    layerId: 'l1',
  };
}

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    addNewLayer: () => 'l42',
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
      const initialState = metricVisualization.initialize(mockFrame());

      expect(initialState.accessor).not.toBeDefined();
      expect(initialState).toMatchInlineSnapshot(`
                Object {
                  "accessor": undefined,
                  "layerId": "l42",
                }
            `);
    });

    it('loads from persisted state', () => {
      expect(metricVisualization.initialize(mockFrame(), exampleState())).toEqual(exampleState());
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
          },
          layerId: 'l1',
          groupId: '',
          columnId: 'newDimension',
        })
      ).toEqual({
        accessor: 'newDimension',
        layerId: 'l1',
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
          },
          layerId: 'l1',
          columnId: 'a',
        })
      ).toEqual({
        accessor: undefined,
        layerId: 'l1',
      });
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
                "mode": Array [
                  "full",
                ],
                "title": Array [
                  "shazm",
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
});
