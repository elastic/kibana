/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TREND_ID = 'trend';
export const RISK_ID = 'risk';

export type AlertViewSelection = 'trend' | 'risk';

export const updateChartVisiblityOnSelection = ({
  alertViewSelection,
  setAlertViewSelection,
  setShowCountTable,
  setShowRiskChart,
  setShowTrendChart,
}: {
  alertViewSelection: AlertViewSelection;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
  setShowCountTable: (show: boolean) => void;
  setShowRiskChart: (show: boolean) => void;
  setShowTrendChart: (show: boolean) => void;
}) => {
  if (alertViewSelection === TREND_ID) {
    setShowRiskChart(false);
    setShowTrendChart(true);
    setShowCountTable(true);
  } else {
    setShowTrendChart(false);
    setShowCountTable(false);
    setShowRiskChart(true);
  }

  setAlertViewSelection(alertViewSelection);
};

export const getChartCount = (alertViewSelection: AlertViewSelection): number =>
  alertViewSelection === RISK_ID ? 1 : 2; // the risk view has a single chart, the trend view has two (trend & count)
