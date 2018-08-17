/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { openDetailPanel, closeDetailPanel } from '../actions/detail_panel';

const defaultState = {};

export const detailPanel = handleActions(
  {
    [openDetailPanel](state, action) {
      const {
        panelType,
        job,
      } = action.payload;

      return {
        panelType: panelType || state.panelType || 'Summary',
        job,
      };
    },
    [closeDetailPanel]() {
      return {};
    },
  },
  defaultState
);
