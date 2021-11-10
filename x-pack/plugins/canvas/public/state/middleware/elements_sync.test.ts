/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elementsSyncMiddleware } from './elements_sync';
import { mockMiddleware } from './test_helpers';
// @ts-expect-error
import * as actions from '../actions/elements';
// @ts-expect-error
import { setExpressionAction, setFilterAction } from '../actions/elements';

const expression = 'some expression';
const filter = 'some filter';

describe('elementsSyncMiddleware', () => {
  const syncFilterWithExprReturnVal = { type: 'syncFilter' };
  const syncExprWithFilterReturnVal = { type: 'syncExpression' };

  let mockedElementsSyncMiddleware = {} as any;
  beforeEach(() => {
    mockedElementsSyncMiddleware = mockMiddleware(elementsSyncMiddleware);
    actions.syncFilterWithExpression = jest.fn().mockReturnValue(syncFilterWithExprReturnVal);
    actions.syncExpressionWithFilter = jest.fn().mockReturnValue(syncExprWithFilterReturnVal);
  });

  it('should pass any action', () => {
    const { next, invoke, store } = mockedElementsSyncMiddleware;
    const action = { type: 'any', payload: { some: 'prop', type: 'any' } };

    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).toHaveBeenCalledTimes(0);
  });

  it('should dispatch syncFilter on setExpression, if need to sync', () => {
    const { next, invoke, store } = mockedElementsSyncMiddleware;
    const action = {
      type: setExpressionAction,
      payload: { type: setExpressionAction, expression, elementId: 1, needSync: true },
    };

    invoke(action);
    expect(next).toHaveBeenCalledWith(action);

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(syncFilterWithExprReturnVal);
  });

  it('should not dispatch syncFilter on setExpression, if no need to sync', () => {
    const { next, invoke, store } = mockedElementsSyncMiddleware;
    const action = {
      type: setExpressionAction,
      payload: { type: setExpressionAction, expression, elementId: 1 },
    };

    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).toHaveBeenCalledTimes(0);
  });

  it('should dispatch syncExpression on setFilter, if need to sync', () => {
    const { next, invoke, store } = mockedElementsSyncMiddleware;
    const action = {
      type: setFilterAction,
      payload: { type: setFilterAction, filter, elementId: 1, needSync: true },
    };

    invoke(action);
    expect(next).toHaveBeenCalledWith(action);

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(syncExprWithFilterReturnVal);
  });

  it('should not dispatch syncExpression on setFilter, if no need to sync', () => {
    const { next, invoke, store } = mockedElementsSyncMiddleware;
    const action = {
      type: setFilterAction,
      payload: { type: setFilterAction, filter, elementId: 1 },
    };

    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).toHaveBeenCalledTimes(0);
  });
});
