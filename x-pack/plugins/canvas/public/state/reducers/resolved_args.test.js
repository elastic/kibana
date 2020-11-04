/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as actions from '../actions/resolved_args';
import { flushContextAfterIndex } from '../actions/elements';
import { resolvedArgsReducer } from './resolved_args';
import { actionCreator } from './__fixtures__/action_creator';

describe('resolved args reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      selectedPage: 'page-1',
      selectedToplevelNodes: ['element-1'],
      resolvedArgs: {
        'element-0': [
          {
            state: 'ready',
            value: 'testing',
            error: null,
          },
          {
            state: 'error',
            value: 'old value',
            error: new Error('error test'),
          },
        ],
      },
    };
  });

  describe('setLoading', () => {
    it('sets state to loading, with string path', () => {
      const action = actionCreator(actions.setLoading)({
        path: 'element-1.0',
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-1']).toMatchInlineSnapshot(`
        Object {
          "0": Object {
            "error": null,
            "state": "pending",
            "value": null,
          },
        }
      `);
    });

    it('sets state to loading, with array path', () => {
      const action = actionCreator(actions.setLoading)({
        path: ['element-1', 0],
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-1']).toMatchInlineSnapshot(`
        Object {
          "0": Object {
            "error": null,
            "state": "pending",
            "value": null,
          },
        }
      `);
    });
  });

  describe('setValue', () => {
    it('sets value and state', () => {
      const value = 'hello world';
      const action = actionCreator(actions.setValue)({
        path: 'element-1.0',
        value,
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-1']).toMatchInlineSnapshot(`
        Object {
          "0": Object {
            "error": null,
            "state": "ready",
            "value": "hello world",
          },
        }
      `);
    });

    it('handles error values', () => {
      const err = new Error('farewell world');
      const action = actionCreator(actions.setValue)({
        path: 'element-1.0',
        value: err,
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-1']).toMatchInlineSnapshot(`
        Object {
          "0": Object {
            "error": [Error: farewell world],
            "state": "error",
            "value": null,
          },
        }
      `);
    });

    it('preserves old value on error', () => {
      const err = new Error('farewell world');
      const action = actionCreator(actions.setValue)({
        path: 'element-0.0',
        value: err,
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-0'][0]).toMatchInlineSnapshot(`
        Object {
          "error": [Error: farewell world],
          "state": "error",
          "value": "testing",
        }
      `);
    });
  });

  describe('clear', () => {
    it('removed resolved value at path', () => {
      const action = actionCreator(actions.clearValue)({
        path: 'element-0.1',
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-0']).toMatchInlineSnapshot(`
        Array [
          Object {
            "error": null,
            "state": "ready",
            "value": "testing",
          },
        ]
      `);
    });

    it('deeply removes resolved values', () => {
      const action = actionCreator(actions.clearValue)({
        path: 'element-0',
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-0']).toBe(undefined);
    });
  });

  describe('flushContextAfterIndex', () => {
    it('removes expression context from a given index to the end', () => {
      state = {
        selectedPage: 'page-1',
        selectedToplevelNodes: ['element-1'],
        resolvedArgs: {
          'element-1': {
            expressionContext: {
              1: {
                state: 'ready',
                value: 'test-1',
                error: null,
              },
              2: {
                state: 'ready',
                value: 'test-2',
                error: null,
              },
              3: {
                state: 'ready',
                value: 'test-3',
                error: null,
              },
              4: {
                state: 'ready',
                value: 'test-4',
                error: null,
              },
            },
          },
        },
      };

      const action = actionCreator(flushContextAfterIndex)({
        elementId: 'element-1',
        index: 3,
      });

      const newState = resolvedArgsReducer(state, action);
      expect(newState.resolvedArgs['element-1']).toMatchInlineSnapshot(`
        Object {
          "expressionContext": Object {
            "1": Object {
              "error": null,
              "state": "ready",
              "value": "test-1",
            },
            "2": Object {
              "error": null,
              "state": "ready",
              "value": "test-2",
            },
          },
        }
      `);
    });
  });
});
