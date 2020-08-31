/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  UIM_DETAIL_PANEL_SUMMARY_TAB,
  UIM_DETAIL_PANEL_SETTINGS_TAB,
  UIM_DETAIL_PANEL_MAPPING_TAB,
  UIM_DETAIL_PANEL_STATS_TAB,
  UIM_DETAIL_PANEL_EDIT_SETTINGS_TAB,
} from '../../../../common/constants';
import {
  TAB_SUMMARY,
  TAB_SETTINGS,
  TAB_MAPPING,
  TAB_STATS,
  TAB_EDIT_SETTINGS,
} from '../../constants';
import { openDetailPanel, closeDetailPanel } from '../actions/detail_panel';
import { loadIndexDataSuccess } from '../actions/load_index_data';
import {
  updateIndexSettingsSuccess,
  updateIndexSettingsError,
} from '../actions/update_index_settings';
import { deleteIndicesSuccess } from '../actions/delete_indices';

const defaultState = {};

export const getDetailPanelReducer = (uiMetricService) =>
  handleActions(
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
        const { panelType, indexName, title } = action.payload;

        const panelTypeToUiMetricMap = {
          [TAB_SUMMARY]: UIM_DETAIL_PANEL_SUMMARY_TAB,
          [TAB_SETTINGS]: UIM_DETAIL_PANEL_SETTINGS_TAB,
          [TAB_MAPPING]: UIM_DETAIL_PANEL_MAPPING_TAB,
          [TAB_STATS]: UIM_DETAIL_PANEL_STATS_TAB,
          [TAB_EDIT_SETTINGS]: UIM_DETAIL_PANEL_EDIT_SETTINGS_TAB,
        };

        if (panelTypeToUiMetricMap[panelType]) {
          uiMetricService.trackMetric('count', panelTypeToUiMetricMap[panelType]);
        }

        return {
          panelType: panelType || state.panelType || TAB_SUMMARY,
          indexName,
          title,
        };
      },
      [closeDetailPanel]() {
        return {};
      },
      [loadIndexDataSuccess](state, action) {
        const { data } = action.payload;
        const newState = {
          ...state,
          data,
        };
        return newState;
      },
      [updateIndexSettingsError](state, action) {
        const { error } = action.payload;
        const newState = {
          ...state,
          error,
        };
        return newState;
      },
      [updateIndexSettingsSuccess]() {
        return {};
      },
    },
    defaultState
  );
