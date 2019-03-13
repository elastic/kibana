/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';

import React from 'react';

import {
  actions,
  createAddAction,
  createDeleteAction,
  DropDown,
  initialState,
  reducer,
} from './dropdown';

describe('DropDown', () => {

  test('addAction', (done) => {
    const dispatch = jest.fn((d) => {
      expect(d).toEqual({ type: actions.ADD_ITEM, payload: 'mockLabel' });
      done();
    });

    const addAction = createAddAction(dispatch);

    addAction([{ label: 'mockLabel' }]);

    expect(dispatch.mock.calls).toHaveLength(1);
  });

  test('deleteAction', (done) => {
    const dispatch = jest.fn((d) => {
      expect(d).toEqual({ type: actions.DELETE_ITEM, payload: 'mockLabel' });
      done();
    });

    const deleteAction = createDeleteAction(dispatch);

    deleteAction('mockLabel');

    expect(dispatch.mock.calls).toHaveLength(1);
  });

  test('reducer', () => {
    const state1 = reducer(initialState, { type: actions.ADD_ITEM, payload: 'mockLabel 1' });
    expect(state1.list).toHaveLength(1);
    expect(state1.list[0]).toBe('mockLabel 1');

    const state2 = reducer(state1, { type: actions.ADD_ITEM, payload: 'mockLabel 2' });
    expect(state2.list).toHaveLength(2);
    expect(state2.list[0]).toBe('mockLabel 1');
    expect(state2.list[1]).toBe('mockLabel 2');

    const state3 = reducer(state2, { type: actions.DELETE_ITEM, payload: 'mockLabel 1' });
    expect(state3.list).toHaveLength(1);
    expect(state3.list[0]).toBe('mockLabel 2');
  });

  test('Component renders without error', () => {
    expect(() => {
      mount(<DropDown />);
    }).not.toThrow();
  });
});
