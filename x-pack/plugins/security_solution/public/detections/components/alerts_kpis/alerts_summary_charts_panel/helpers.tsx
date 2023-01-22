/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationType } from './types';
import type { AlertsBySeverityAgg } from '../severity_level_panel/types';
import type { AlertsByTypeAgg } from '../alerts_by_type_panel/types';
import type { AlertsByGroupingAgg } from '../alerts_progress_bar_panel/types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { parseSeverityData } from '../severity_level_panel/helpers';
import { parseAlertsTypeData } from '../alerts_by_type_panel/helpers';
import { parseAlertsGroupingData } from '../alerts_progress_bar_panel/helpers';

export const parseData = (aggregationType: AggregationType, data: AlertSearchResponse<{}, {}>) => {
  switch (aggregationType) {
    case 'Severity':
      return parseSeverityData(data as AlertSearchResponse<{}, AlertsBySeverityAgg>);
    case 'Type':
      return parseAlertsTypeData(data as AlertSearchResponse<{}, AlertsByTypeAgg>);
    case 'Top':
      return parseAlertsGroupingData(data as AlertSearchResponse<{}, AlertsByGroupingAgg>);
  }
};
