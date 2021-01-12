/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPieVisualization } from './visualization';
import { PieVisualizationState } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_service/mocks';
import { DatasourcePublicAPI, FramePublicAPI } from '../types';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';

jest.mock('../id_generator');

const LAYER_ID = 'l1';

const pieVisualization = getPieVisualization({
  paletteService: chartPluginMock.createPaletteRegistry(),
});

function exampleState(): PieVisualizationState {
  return {
    shape: 'pie',
    layers: [
      {
        layerId: LAYER_ID,
        groups: [],
        metric: undefined,
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay: 'default',
        nestedLegend: false,
      },
    ],
  };
}

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    addNewLayer: () => LAYER_ID,
    datasourceLayers: {
      [LAYER_ID]: createMockDatasource(LAYER_ID).publicAPIMock,
    },
  };
}

// Just a basic bootstrap here to kickstart the tests
describe('pie_visualization', () => {
  describe('#getErrorMessages', () => {
    it('returns undefined if no error is raised', () => {
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

      const error = pieVisualization.getErrorMessages(exampleState(), frame);

      expect(error).not.toBeDefined();
    });
  });
});
