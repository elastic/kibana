/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { ViewSelection } from '../../components/events_viewer/summary_view_select';
import type { AlertTableState } from './types';

const actionCreator = actionCreatorFactory('x-pack/security-solution/alert_table');

export const createAlertTableData = actionCreator<AlertTableState>('CREATE_ALERT_TABLE');

export const changeAlertTableViewMode = actionCreator<{
  viewMode: ViewSelection;
}>('CHANGE_ALERT_TABLE_VIEW_MODE');

export const updateShowBuildingBlockAlertsFilter = actionCreator<{
  showBuildingBlockAlerts: boolean;
}>('UPDATE_BUILDING_BLOCK_ALERTS_FILTER');

export const updateShowThreatIndicatorAlertsFilter = actionCreator<{
  showOnlyThreatIndicatorAlerts: boolean;
}>('UPDATE_SHOW_THREAT_INDICATOR_ALERTS_FILTER');
