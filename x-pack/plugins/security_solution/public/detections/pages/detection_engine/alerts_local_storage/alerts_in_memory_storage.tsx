/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import { AlertViewSelection, TREND_ID } from '../chart_select/helpers';
import {
  DEFAULT_STACK_BY_FIELD1,
  DEFAULT_STACK_BY_FIELD,
} from '../../../components/alerts_kpis/common/config';
import type { AlertsSettings } from './types';

/**
 * This hook provides an interface that's identical to the
 * `useAlertsLocalStorage` hook, but provides a simple in-memory implementation
 * that can be deleted when the `alertsTreemapEnabled` feature flag in
 * `experimental_features` is removed
 */
export const useAlertsInMemoryStorage = (): AlertsSettings => {
  const [alertViewSelection, setAlertViewSelection] = useState<AlertViewSelection>(TREND_ID);

  const [expandRiskChart, setExpandRiskChart] = useState<boolean>(true);

  const [riskChartStackBy0, setRiskChartStackBy0] = useState<string>(DEFAULT_STACK_BY_FIELD);

  const [riskChartStackBy1, setRiskChartStackBy1] = useState<string | undefined>(
    DEFAULT_STACK_BY_FIELD1
  );

  const [countTableStackBy0, setCountTableStackBy0] = useState<string>(DEFAULT_STACK_BY_FIELD);

  const [countTableStackBy1, setCountTableStackBy1] = useState<string | undefined>(
    DEFAULT_STACK_BY_FIELD1
  );

  const [showCountsInTrendChartLegend, setShowCountsInTrendChartLegend] = useState<boolean>(true);

  const [showRiskChart, setShowRiskChart] = useState<boolean>(false);

  const [showCountTable, setShowCountTable] = useState<boolean>(true);

  const [showTrendChart, setShowTrendChart] = useState<boolean>(true);

  const [trendChartStackBy, setTrendChartStackBy] = useState<string>(DEFAULT_STACK_BY_FIELD);

  const [tourStep1Completed, setTourStep1Completed] = useState<boolean>(false);

  const [tourStep2Completed, setTourStep2Completed] = useState<boolean>(false);

  return {
    alertViewSelection,
    countTableStackBy0,
    countTableStackBy1,
    expandRiskChart,
    riskChartStackBy0,
    riskChartStackBy1,
    setAlertViewSelection,
    setCountTableStackBy0,
    setCountTableStackBy1,
    setExpandRiskChart,
    setRiskChartStackBy0,
    setRiskChartStackBy1,
    setShowCountsInTrendChartLegend,
    setShowCountTable,
    setShowRiskChart,
    setShowTrendChart,
    setTourStep1Completed,
    setTourStep2Completed,
    setTrendChartStackBy,
    showCountsInTrendChartLegend,
    showCountTable,
    showRiskChart,
    showTrendChart,
    trendChartStackBy,
    tourStep1Completed,
    tourStep2Completed,
  };
};
