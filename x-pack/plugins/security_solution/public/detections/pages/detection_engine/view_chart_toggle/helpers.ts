/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertViewSelection, getChartCount } from '../chart_select/helpers';
import * as i18n from './translations';

export const getIconType = ({
  alertViewSelection,
  showRiskChart,
  showTrendChart,
}: {
  alertViewSelection: AlertViewSelection;
  showRiskChart: boolean;
  showTrendChart: boolean;
}): 'eyeClosed' | 'eye' => {
  if (alertViewSelection === 'trend') {
    return showTrendChart ? 'eyeClosed' : 'eye';
  } else {
    return showRiskChart ? 'eyeClosed' : 'eye';
  }
};

export const getButtonText = ({
  alertViewSelection,
  showRiskChart,
  showTrendChart,
}: {
  alertViewSelection: AlertViewSelection;
  showRiskChart: boolean;
  showTrendChart: boolean;
}): string => {
  const chartCount = getChartCount(alertViewSelection);

  if (alertViewSelection === 'trend') {
    return showTrendChart ? i18n.HIDE_CHARTS(chartCount) : i18n.SHOW_CHARTS(chartCount);
  } else {
    return showRiskChart ? i18n.HIDE_CHARTS(chartCount) : i18n.SHOW_CHARTS(chartCount);
  }
};

export const onToggle = ({
  alertViewSelection,
  setShowCountTable,
  setShowRiskChart,
  setShowTrendChart,
  showCountTable,
  showRiskChart,
  showTrendChart,
}: {
  alertViewSelection: AlertViewSelection;
  setShowCountTable: (show: boolean) => void;
  setShowRiskChart: (show: boolean) => void;
  setShowTrendChart: (show: boolean) => void;
  showCountTable: boolean;
  showRiskChart: boolean;
  showTrendChart: boolean;
}) => {
  if (alertViewSelection === 'trend') {
    setShowTrendChart(!showTrendChart);
    setShowCountTable(!showCountTable);
    setShowRiskChart(false);
  } else {
    setShowTrendChart(false);
    setShowCountTable(false);
    setShowRiskChart(!showRiskChart);
  }
};
