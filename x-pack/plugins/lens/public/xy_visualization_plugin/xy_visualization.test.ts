/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization } from './xy_visualization';
import { Position } from '@elastic/charts';
import { State } from './types';

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

describe('IndexPattern Data Source', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      const initialState = xyVisualization.initialize();

      expect(initialState.x.accessor).toBeDefined();
      expect(initialState.y.accessors[0]).toBeDefined();
      expect(initialState.x.accessor).not.toEqual(initialState.y.accessors[0]);

      // These change with each generation, so we'll ignore them
      // in our match snapshot test.
      delete initialState.x.accessor;
      delete initialState.y.accessors;

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
    "position": "bottom",
    "showGridlines": false,
    "title": "X",
  },
  "y": Object {
    "position": "left",
    "showGridlines": false,
    "title": "Y",
  },
}
`);
    });

    it('loads from persisted state', () => {
      expect(xyVisualization.initialize(exampleState())).toEqual(exampleState());
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(xyVisualization.getPersistableState(exampleState())).toEqual(exampleState());
    });
  });
});
