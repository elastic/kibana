/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from "redux-actions";
import { openDetailPanel, closeDetailPanel } from '../actions/detail_panel';
import { loadIndexDataSuccess } from '../actions/load_index_data';
import { updateIndexSettingsSuccess, updateIndexSettingsError } from '../actions/update_index_settings';
import { deleteIndicesSuccess } from '../actions/delete_indices';

const defaultState = {};

export const detailPanel = handleActions(
  {
    [deleteIndicesSuccess](state, action) {
      const { indexNames } = action.payload;
      const { indexName } = state;
      if (indexNames.includes(indexName)) {
        return {};
      } else {
        return state;
      }
    },
    [openDetailPanel](state, action) {
      const {
        panelType,
        indexName,
        title
      } = action.payload;
      return {
        panelType: panelType || state.panelType || 'Summary',
        indexName,
        title
      };
    },
    [closeDetailPanel]() {
      return {};
    },
    [loadIndexDataSuccess](state, action) {
      const { data } = action.payload;
      const newState = {
        ...state,
        data
      };
      return newState;
    },
    [updateIndexSettingsError](state, action) {
      const { error } = action.payload;
      const newState = {
        ...state,
        error
      };
      return newState;
    },
    [updateIndexSettingsSuccess]() {
      return {};
    },
  },
  defaultState
);