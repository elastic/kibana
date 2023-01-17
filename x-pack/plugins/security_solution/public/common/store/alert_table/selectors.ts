/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { AlertTableState } from './types';

const selectAlertTable = (state: AlertTableState) => state.alertTable;

export const alertTableViewModeSelector = () =>
  createSelector(selectAlertTable, (model) => model.viewMode);

export const isAlertTableLoadingSelector = () =>
  createSelector(selectAlertTable, (model) => model.isLoading);

export const showBuildingBlockAlertsSelector = () =>
  createSelector(selectAlertTable, (model) => model.showBuildingBlockAlerts);

export const showOnlyThreatIndicatorAlertsSelector = () =>
  createSelector(selectAlertTable, (model) => model.showOnlyThreatIndicatorAlerts);

export const totalAlertsCount = createSelector(selectAlertTable, (model) => model.totalCount);
