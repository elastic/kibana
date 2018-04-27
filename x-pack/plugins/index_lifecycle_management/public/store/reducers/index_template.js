/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { handleActions } from 'redux-actions';
import {
  fetchingIndexTemplates,
  fetchedIndexTemplates,
  setSelectedIndexTemplateName,
  fetchedIndexTemplate
} from '../actions/index_template';

const defaultState = {
  isLoading: false,
  fullSelectedIndexTemplate: null,
  selectedIndexTemplateName: '',
  indexTemplates: null,
};

export const indexTemplate = handleActions(
  {
    [fetchingIndexTemplates](state) {
      return {
        ...state,
        isLoading: true
      };
    },
    [fetchedIndexTemplates](state, { payload: indexTemplates }) {
      return {
        ...state,
        isLoading: false,
        indexTemplates
      };
    },
    [fetchedIndexTemplate](state, { payload: fullSelectedIndexTemplate }) {
      return {
        ...state,
        fullSelectedIndexTemplate,
      };
    },
    [setSelectedIndexTemplateName](state, { payload: selectedIndexTemplateName }) {
      return {
        ...state,
        selectedIndexTemplateName
      };
    }
  },
  defaultState
);
