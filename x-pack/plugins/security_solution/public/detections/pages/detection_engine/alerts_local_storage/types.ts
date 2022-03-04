/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertViewSelection } from '../chart_select/helpers';

export interface AlertsSettings {
  alertViewSelection: AlertViewSelection;
  countTableStackBy0: string;
  countTableStackBy1: string | undefined;
  expandRiskChart: boolean;
  riskChartStackBy0: string;
  riskChartStackBy1: string | undefined;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
  setCountTableStackBy0: (value: string) => void;
  setCountTableStackBy1: (value: string | undefined) => void;
  setExpandRiskChart: (value: boolean) => void;
  setRiskChartStackBy0: (value: string) => void;
  setRiskChartStackBy1: (value: string | undefined) => void;
  setShowCountsInTrendChartLegend: (value: boolean) => void;
  setShowCountTable: (value: boolean) => void;
  setShowRiskChart: (value: boolean) => void;
  setShowTrendChart: (value: boolean) => void;
  setTourStep1Completed: (value: boolean) => void;
  setTourStep2Completed: (value: boolean) => void;
  setTrendChartStackBy: (value: string) => void;
  showCountsInTrendChartLegend: boolean;
  showCountTable: boolean;
  showRiskChart: boolean;
  showTrendChart: boolean;
  tourStep1Completed: boolean;
  tourStep2Completed: boolean;
  trendChartStackBy: string;
}
