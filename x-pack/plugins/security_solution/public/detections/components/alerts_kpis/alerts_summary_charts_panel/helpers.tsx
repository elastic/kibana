/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isAlertsBySeverityAgg, isAlertsByTypeAgg, isAlertsByGroupingAgg } from './types';
import type { SummaryChartsAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { parseSeverityData } from '../severity_level_panel/helpers';
import { parseAlertsTypeData } from '../alerts_by_type_panel/helpers';
import { parseAlertsGroupingData } from '../alerts_progress_bar_panel/helpers';

export const parseData = (data: AlertSearchResponse<{}, SummaryChartsAgg>) => {
  if (isAlertsBySeverityAgg(data)) {
    return parseSeverityData(data);
  }
  if (isAlertsByTypeAgg(data)) {
    return parseAlertsTypeData(data);
  }
  if (isAlertsByGroupingAgg(data)) {
    return parseAlertsGroupingData(data);
  }
  return [];
};
