/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertViewSelection } from '../chart_select/helpers';

export interface AlertsSettings {
  alertViewSelection: AlertViewSelection;
  countTableStackBy0: string;
  countTableStackBy1: string | undefined;
  isTreemapPanelExpanded: boolean;
  riskChartStackBy0: string;
  riskChartStackBy1: string | undefined;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
  setCountTableStackBy0: (value: string) => void;
  setCountTableStackBy1: (value: string | undefined) => void;
  setIsTreemapPanelExpanded: (value: boolean) => void;
  setRiskChartStackBy0: (value: string) => void;
  setRiskChartStackBy1: (value: string | undefined) => void;
  setTrendChartStackBy: (value: string) => void;
  trendChartStackBy: string;
}
