import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import {
  getIsChartCollapseAgg,
  parseChartCollapseData,
} from '../../../pages/detection_engine/chart_panels/chart_collapse/helpers';
import {
  getIsAlertsByRuleAgg,
  getIsAlertsByTypeAgg,
  parseAlertsRuleData,
  parseAlertsTypeData,
} from '../alerts_by_type_panel/helpers';
import {
  getIsAlertsByGroupingAgg,
  parseAlertsGroupingData,
} from '../alerts_progress_bar_panel/helpers';
import { getIsAlertsBySeverityAgg, parseSeverityData } from '../severity_level_panel/helpers';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SummaryChartsAgg } from './types';

export const parseData = (data: AlertSearchResponse<{}, SummaryChartsAgg>) => {
  if (getIsAlertsBySeverityAgg(data)) {
    return parseSeverityData(data);
  }
  if (getIsAlertsByTypeAgg(data)) {
    return parseAlertsTypeData(data);
  }
  if (getIsAlertsByRuleAgg(data)) {
    return parseAlertsRuleData(data);
  }
  if (getIsAlertsByGroupingAgg(data)) {
    return parseAlertsGroupingData(data);
  }
  if (getIsChartCollapseAgg(data)) {
    return parseChartCollapseData(data);
  }
  return [];
};
