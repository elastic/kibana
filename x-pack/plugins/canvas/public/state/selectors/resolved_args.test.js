/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as selector from './resolved_args';

describe('resolved args selector', () => {
  let state;

  beforeEach(() => {
    state = {
      transient: {
        resolvedArgs: {
          test1: {
            state: 'ready',
            value: 'test value',
            error: null,
          },
          test2: {
            state: 'pending',
            value: null,
            error: null,
          },
          test3: {
            state: 'error',
            value: 'some old value',
            error: new Error('i have failed'),
          },
        },
      },
    };
  });

  it('getValue returns the state', () => {
    expect(selector.getState(state, 'test1')).toEqual('ready');
    expect(selector.getState(state, 'test2')).toEqual('pending');
    expect(selector.getState(state, 'test3')).toEqual('error');
  });

  it('getValue returns the value', () => {
    expect(selector.getValue(state, 'test1')).toEqual('test value');
    expect(selector.getValue(state, 'test2')).toEqual(null);
    expect(selector.getValue(state, 'test3')).toEqual('some old value');
  });

  it('getError returns the error', () => {
    expect(selector.getError(state, 'test1')).toEqual(null);
    expect(selector.getError(state, 'test2')).toEqual(null);
    expect(selector.getError(state, 'test3')).toMatchInlineSnapshot(`[Error: i have failed]`);
  });
});
