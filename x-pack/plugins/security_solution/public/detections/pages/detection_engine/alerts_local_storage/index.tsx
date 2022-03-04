/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from '../../../../common/components/local_storage';
import {
  getSettingKey,
  useDefaultWhenEmptyString,
} from '../../../../common/components/local_storage/helpers';
import { APP_ID } from '../../../../../common/constants';
import {
  ALERTS_PAGE,
  ALERT_VIEW_SELECTION_SETTING_NAME,
  COUNT_CHART_CATEGORY,
  EXPAND_SETTING_NAME,
  RISK_CHART_CATEGORY,
  SHOW_COUNTS_IN_LEGEND,
  SHOW_SETTING_NAME,
  STACK_BY_0_SETTING_NAME,
  STACK_BY_1_SETTING_NAME,
  STACK_BY_SETTING_NAME,
  TOUR_STEP_1_COMPLETED_SETTING_NAME,
  TOUR_STEP_2_COMPLETED_SETTING_NAME,
  TREND_CHART_CATEGORY,
  VIEW_CATEGORY,
} from './constants';
import {
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../components/alerts_kpis/common/config';
import type { AlertsSettings } from './types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useAlertsInMemoryStorage } from './alerts_in_memory_storage';
import { AlertViewSelection, TREND_ID } from '../chart_select/helpers';

export const useAlertsLocalStorage = (): AlertsSettings => {
  const alertsTreemapEnabled = useIsExperimentalFeatureEnabled('alertsTreemapEnabled'); // feature flag

  const [alertViewSelection, setAlertViewSelection] = useLocalStorage<AlertViewSelection>({
    defaultValue: TREND_ID,
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ALERTS_PAGE,
      setting: ALERT_VIEW_SELECTION_SETTING_NAME,
    }),
    plugin: APP_ID,
    isInvalidDefault: useDefaultWhenEmptyString,
  });

  const [expandRiskChart, setExpandRiskChart] = useLocalStorage<boolean>({
    defaultValue: true,
    key: getSettingKey({
      category: RISK_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: EXPAND_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [riskChartStackBy0, setRiskChartStackBy0] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: RISK_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_0_SETTING_NAME,
    }),
    plugin: APP_ID,
    isInvalidDefault: useDefaultWhenEmptyString,
  });

  const [riskChartStackBy1, setRiskChartStackBy1] = useLocalStorage<string | undefined>({
    defaultValue: DEFAULT_STACK_BY_FIELD1,
    key: getSettingKey({
      category: RISK_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_1_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [countTableStackBy0, setCountTableStackBy0] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: COUNT_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_0_SETTING_NAME,
    }),
    plugin: APP_ID,
    isInvalidDefault: useDefaultWhenEmptyString,
  });

  const [countTableStackBy1, setCountTableStackBy1] = useLocalStorage<string | undefined>({
    defaultValue: DEFAULT_STACK_BY_FIELD1,
    key: getSettingKey({
      category: COUNT_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_1_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [trendChartStackBy, setTrendChartStackBy] = useLocalStorage<string>({
    defaultValue: DEFAULT_STACK_BY_FIELD,
    key: getSettingKey({
      category: TREND_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: STACK_BY_SETTING_NAME,
    }),
    plugin: APP_ID,
    isInvalidDefault: useDefaultWhenEmptyString,
  });

  const [showCountsInTrendChartLegend, setShowCountsInTrendChartLegend] = useLocalStorage<boolean>({
    defaultValue: true,
    key: getSettingKey({
      category: TREND_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: SHOW_COUNTS_IN_LEGEND,
    }),
    plugin: APP_ID,
  });

  const [showRiskChart, setShowRiskChart] = useLocalStorage<boolean>({
    defaultValue: false,
    key: getSettingKey({
      category: RISK_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: SHOW_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [showCountTable, setShowCountTable] = useLocalStorage<boolean>({
    defaultValue: true,
    key: getSettingKey({
      category: COUNT_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: SHOW_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [showTrendChart, setShowTrendChart] = useLocalStorage<boolean>({
    defaultValue: true,
    key: getSettingKey({
      category: TREND_CHART_CATEGORY,
      page: ALERTS_PAGE,
      setting: SHOW_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [tourStep1Completed, setTourStep1Completed] = useLocalStorage<boolean>({
    defaultValue: false,
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ALERTS_PAGE,
      setting: TOUR_STEP_1_COMPLETED_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const [tourStep2Completed, setTourStep2Completed] = useLocalStorage<boolean>({
    defaultValue: false,
    key: getSettingKey({
      category: VIEW_CATEGORY,
      page: ALERTS_PAGE,
      setting: TOUR_STEP_2_COMPLETED_SETTING_NAME,
    }),
    plugin: APP_ID,
  });

  const inMemoryStorage = useAlertsInMemoryStorage();

  // fallback to in memory storage if the `alertsTreemapEnabled` feature flag is false
  return alertsTreemapEnabled
    ? {
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
        setTrendChartStackBy,
        setTourStep1Completed,
        setTourStep2Completed,
        showCountsInTrendChartLegend,
        showCountTable,
        showRiskChart,
        showTrendChart,
        tourStep1Completed,
        tourStep2Completed,
        trendChartStackBy,
      }
    : inMemoryStorage;
};
