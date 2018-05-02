/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { STATUS } from '../constants';
import _ from 'lodash';
const hash = require('object-hash/index');

export function createActionTypes(actionName) {
  return [
    `${actionName}_LOADING`,
    `${actionName}_SUCCESS`,
    `${actionName}_FAILURE`
  ];
}

export function createReducer(actionTypes, initialData) {
  const [LOADING, SUCCESS, FAILURE] = actionTypes;

  return (state, action) => {
    switch (action.type) {
      case LOADING:
        return {
          key: action.key,
          keyArgs: action.keyArgs,
          data: _.get(state, 'data', initialData),
          status: STATUS.LOADING
        };

      case SUCCESS:
        // This should avoid race-conditions so a slow response doesn't overwrite a newer response (faster) response
        if (action.key !== _.get(state, 'key')) {
          return state;
        }

        return {
          key: action.key,
          keyArgs: action.keyArgs,
          data: action.response, // TODO: rename 'data' to 'response'
          status: STATUS.SUCCESS
        };

      case FAILURE:
        return {
          key: action.key,
          keyArgs: action.keyArgs,
          data: initialData,
          status: STATUS.FAILURE,
          error: action.errorResponse // TODO: rename 'error' to 'errorResponse'
        };
      default:
        return state || { data: initialData };
    }
  };
}

export function createAction(actionTypes, callApi) {
  const [LOADING, SUCCESS, FAILURE] = actionTypes;

  return (keyArgs = {}) => {
    return async dispatch => {
      const key = hash(keyArgs);
      dispatch({ key, keyArgs, type: LOADING });

      let response;
      try {
        response = await callApi(keyArgs);
      } catch (errorResponse) {
        console.error(errorResponse);
        return dispatch({
          key,
          keyArgs,
          errorResponse,
          type: FAILURE
        });
      }

      try {
        return dispatch({
          key,
          keyArgs,
          response,
          type: SUCCESS
        });
      } catch (error) {
        console.error(error);
      }
    };
  };
}

const hasEmptyProps = obj => _.some(obj, value => value == null);
export const getKey = (obj = {}, notNull = true) => {
  return notNull && hasEmptyProps(obj) ? null : hash(obj);
};
