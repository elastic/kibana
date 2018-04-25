/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore } from 'redux';
import { STATUS } from '../../constants';
import {
  createActionTypes,
  createReducer,
  createAction,
  getKey
} from '../apiHelpers';

describe('apiHelpers', () => {
  describe('Reducers should not be prone to race conditions', () => {
    it('should return the response for the action that was initiated (started loading) last', () => {
      const actionTypes = createActionTypes('MY_ACTION');
      const [ACTION_LOADING, ACTION_SUCCESS] = actionTypes;
      const reducer = createReducer(actionTypes, {});
      const store = createStore(reducer);

      store.dispatch({
        key: 'first',
        type: ACTION_LOADING
      });

      store.dispatch({
        key: 'second',
        type: ACTION_LOADING
      });

      store.dispatch({
        key: 'second',
        response: 'response from second',
        type: ACTION_SUCCESS
      });

      store.dispatch({
        key: 'first',
        response: 'response from first',
        type: ACTION_SUCCESS
      });

      expect(store.getState()).toEqual({
        data: 'response from second',
        key: 'second',
        status: 'SUCCESS'
      });
    });
  });

  describe('createActionTypes', () => {
    it('should return 3 action types', () => {
      expect(createActionTypes('MY_ACTION')).toEqual([
        'MY_ACTION_LOADING',
        'MY_ACTION_SUCCESS',
        'MY_ACTION_FAILURE'
      ]);
    });
  });

  describe('createReducer', () => {
    const actionTypes = createActionTypes('MY_ACTION_TYPE');
    const [
      MY_ACTION_TYPE_LOADING,
      MY_ACTION_TYPE_SUCCESS,
      MY_ACTION_TYPE_FAILURE
    ] = actionTypes;

    const initialData = { foo: 'intitial data' };

    it('should return loading state with initial data', () => {
      expect(
        createReducer(actionTypes, initialData)(undefined, {
          type: MY_ACTION_TYPE_LOADING
        })
      ).toEqual({
        status: STATUS.LOADING,
        data: { foo: 'intitial data' }
      });
    });

    it('should return loading state with store data', () => {
      expect(
        createReducer(actionTypes, initialData)(
          { data: 'previous data' },
          {
            type: MY_ACTION_TYPE_LOADING
          }
        )
      ).toEqual({
        data: 'previous data',
        status: STATUS.LOADING
      });
    });

    it('should return success state', () => {
      expect(
        createReducer(actionTypes, initialData)(undefined, {
          response: { user: 1337 },
          type: MY_ACTION_TYPE_SUCCESS
        })
      ).toEqual({
        data: { user: 1337 },
        status: STATUS.SUCCESS
      });
    });

    it('should return failure state', () => {
      console.error = jest.fn();

      expect(
        createReducer(actionTypes, initialData)(undefined, {
          errorResponse: { msg: 'Something failed :(' },
          type: MY_ACTION_TYPE_FAILURE
        })
      ).toEqual({
        error: { msg: 'Something failed :(' },
        data: { foo: 'intitial data' },
        status: STATUS.FAILURE
      });
    });

    it('should return default state', () => {
      console.error = jest.fn();

      expect(
        createReducer(actionTypes, initialData)(undefined, {
          type: 'NON_MATCHING_TYPE'
        })
      ).toEqual({
        data: { foo: 'intitial data' }
      });
    });
  });

  describe('createAction', () => {
    const actionTypes = createActionTypes('MY_ACTION_TYPE');
    const [
      MY_ACTION_TYPE_LOADING,
      MY_ACTION_TYPE_SUCCESS,
      MY_ACTION_TYPE_FAILURE
    ] = actionTypes;

    describe('succesful request', () => {
      let key;
      let dispatchMock;
      let apiMock;
      let keyArgs;
      beforeEach(async () => {
        dispatchMock = jest.fn();
        apiMock = jest.fn(() => Promise.resolve('foo'));
        keyArgs = { a: 'aa', b: 'bb' };
        key = getKey(keyArgs);
        await createAction(actionTypes, apiMock)(keyArgs)(dispatchMock);
      });

      it('should dispatch loading action', () => {
        expect(dispatchMock).toHaveBeenCalledWith({
          keyArgs,
          key,
          type: MY_ACTION_TYPE_LOADING
        });
      });

      it('should call apiMock with keyArgs', () => {
        expect(apiMock).toHaveBeenCalledWith(keyArgs);
      });

      it('should dispatch success action', () => {
        expect(dispatchMock).toHaveBeenCalledWith({
          keyArgs,
          key,
          response: 'foo',
          type: MY_ACTION_TYPE_SUCCESS
        });
      });
    });

    describe('unsuccesful request', () => {
      it('should dispatch error action', async () => {
        const dispatchMock = jest.fn();
        const apiMock = jest.fn(() =>
          Promise.reject(new Error('an error occured :('))
        );
        const keyArgs = { a: 'aa', b: 'bb' };
        const key = getKey(keyArgs);
        await createAction(actionTypes, apiMock)(keyArgs)(dispatchMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          keyArgs,
          key,
          errorResponse: expect.any(Error),
          type: MY_ACTION_TYPE_FAILURE
        });
      });
    });

    describe('without arguments', () => {
      it('should dispatch success action', async () => {
        const dispatchMock = jest.fn();
        const apiMock = jest.fn(() => Promise.resolve('foobar'));
        const keyArgs = undefined;
        const key = getKey(keyArgs);
        await createAction(actionTypes, apiMock)(keyArgs)(dispatchMock);

        expect(dispatchMock).toHaveBeenCalledWith({
          keyArgs: {},
          key,
          response: 'foobar',
          type: MY_ACTION_TYPE_SUCCESS
        });
      });
    });
  });
});
