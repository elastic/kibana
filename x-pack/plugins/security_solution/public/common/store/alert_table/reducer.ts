/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import {
  changeAlertTableViewMode,
  updateShowBuildingBlockAlertsFilter,
  updateShowThreatIndicatorAlertsFilter,
} from './actions';
import { defaultAlertTableModel } from './defaults';

const initialAlertTableState = defaultAlertTableModel;

export const alertTableReducer = reducerWithInitialState(initialAlertTableState)
  .case(changeAlertTableViewMode, (state, { viewMode }) => ({
    ...state,
    viewMode,
  }))
  .case(updateShowBuildingBlockAlertsFilter, (state, { showBuildingBlockAlerts }) => ({
    ...state,
    showBuildingBlockAlerts,
  }))
  .case(updateShowThreatIndicatorAlertsFilter, (state, { showOnlyThreatIndicatorAlerts }) => ({
    ...state,
    showOnlyThreatIndicatorAlerts,
  }));
