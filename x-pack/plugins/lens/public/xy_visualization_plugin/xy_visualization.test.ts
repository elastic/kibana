/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization, State } from './xy_visualization';
import { Position } from '@elastic/charts';

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
      expect(xyVisualization.initialize()).toMatchInlineSnapshot(`
Object {
  "legend": Object {
    "isVisible": true,
    "position": "right",
  },
  "seriesType": "line",
  "splitSeriesAccessors": Array [],
  "stackAccessors": Array [],
  "title": "Empty line chart",
  "x": Object {
    "accessor": "",
    "position": "bottom",
    "showGridlines": false,
    "title": "Uknown",
  },
  "y": Object {
    "accessors": Array [],
    "position": "left",
    "showGridlines": false,
    "title": "Uknown",
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
