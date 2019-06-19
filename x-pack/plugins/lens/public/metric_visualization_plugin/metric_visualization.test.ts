/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricVisualization } from './metric_visualization';
import { DatasourcePublicAPI } from '../types';
import { State } from './types';
import { createMockDatasource } from '../editor_frame_plugin/mocks';

function exampleState(): State {
  return {
    title: 'Foo',
    accessor: 'a',
  };
}

describe('metric_visualization', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      const mockDatasource = createMockDatasource();
      mockDatasource.publicAPIMock.generateColumnId
        .mockReturnValue('test-id1')
        .mockReturnValueOnce('test-id2');
      const initialState = metricVisualization.initialize(mockDatasource.publicAPIMock);

      expect(initialState.accessor).toBeDefined();
      expect(initialState.title).toBeDefined();

      expect(initialState).toMatchInlineSnapshot(`
Object {
  "accessor": "test-id2",
  "title": "Empty Metric Chart",
}
`);
    });

    it('loads from persisted state', () => {
      expect(
        metricVisualization.initialize(createMockDatasource().publicAPIMock, exampleState())
      ).toEqual(exampleState());
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(metricVisualization.getPersistableState(exampleState())).toEqual(exampleState());
    });
  });

  describe('#toExpression', () => {
    it('should map to a valid AST', () => {
      expect(metricVisualization.toExpression(exampleState(), {} as DatasourcePublicAPI))
        .toMatchInlineSnapshot(`
Object {
  "chain": Array [
    Object {
      "arguments": Object {
        "accessor": Array [
          "a",
        ],
        "title": Array [
          "Foo",
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
