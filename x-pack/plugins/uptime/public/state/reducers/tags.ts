/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { getTags, getTagsSuccess, getTagsFail } from '../actions/tags';

export interface TagsState {
  tags: string[];
  loading: boolean;
  errors: Error[];
}

const initialState: TagsState = {
  loading: false,
  tags: [],
  errors: [],
};

export function tagsReducer(state = initialState, action: Action<any>): TagsState {
  switch (action.type) {
    case String(getTags):
      return {
        ...state,
        loading: true,
      };
    case String(getTagsSuccess):
      return {
        ...state,
        tags: action.payload,
      };
    case String(getTagsFail):
      return {
        ...state,
        errors: action.payload,
      };
    default:
      return state;
  }
}
