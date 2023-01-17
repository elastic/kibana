/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewSelection } from '../../components/events_viewer/summary_view_select';

export interface AlertTableModel {
  viewMode: ViewSelection;
  totalCount: number;
  isLoading: boolean;
  showBuildingBlockAlerts: boolean;
  showOnlyThreatIndicatorAlerts: boolean;
}

export interface AlertTableState {
  alertTable: AlertTableModel;
}
