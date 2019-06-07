/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization } from './xy_visualization';
import { Position } from '@elastic/charts';
import { DatasourcePublicAPI } from '../types';
import { State } from './types';
import { createMockDatasource } from '../editor_frame_plugin/mocks';

function exampleState(): State {
  return {
    legend: { position: Position.Bottom, isVisible: true },
    seriesType: 'area',
    splitSeriesAccessors: [],
    stackAccessors: [],
    title: 'Foo',
    x: {
      accessor: 'a',
      position: Position.Bottom,
      showGridlines: true,
      title: 'Baz',
    },
    y: {
      accessors: ['b', 'c'],
      position: Position.Left,
      showGridlines: true,
      title: 'Bar',
    },
  };
}

describe('xy_visualization', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      const mockDatasource = createMockDatasource();
      mockDatasource.publicAPIMock.generateColumnId
        .mockReturnValue('test-id1')
        .mockReturnValueOnce('test-id2');
      const initialState = xyVisualization.initialize(mockDatasource.publicAPIMock);

      expect(initialState.x.accessor).toBeDefined();
      expect(initialState.y.accessors[0]).toBeDefined();
      expect(initialState.x.accessor).not.toEqual(initialState.y.accessors[0]);

      expect(initialState).toMatchInlineSnapshot(`
Object {
  "legend": Object {
    "isVisible": true,
    "position": "right",
  },
  "seriesType": "line",
  "splitSeriesAccessors": Array [],
  "stackAccessors": Array [],
  "title": "Empty XY Chart",
  "x": Object {
    "accessor": "test-id2",
    "position": "bottom",
    "showGridlines": false,
    "title": "X",
  },
  "y": Object {
    "accessors": Array [
      "test-id1",
    ],
    "position": "left",
    "showGridlines": false,
    "title": "Y",
  },
}
`);
    });

    it('loads from persisted state', () => {
      expect(
        xyVisualization.initialize(createMockDatasource().publicAPIMock, exampleState())
      ).toEqual(exampleState());
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(xyVisualization.getPersistableState(exampleState())).toEqual(exampleState());
    });
  });

  describe('#toExpression', () => {
    it('should map to a valid AST', () => {
      expect(
        xyVisualization.toExpression(exampleState(), {} as DatasourcePublicAPI)
      ).toMatchSnapshot();
    });
  });
});
