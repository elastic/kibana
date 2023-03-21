/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { TimeSeriesResult } from '@kbn/triggers-actions-ui-plugin/common';
import { IndexThresholdRuleParams } from './types';

const INDEX_THRESHOLD_DATA_API_ROOT = '/internal/triggers_actions_ui/data';

export interface GetThresholdRuleVisualizationDataParams {
  model: IndexThresholdRuleParams;
  visualizeOptions: {
    rangeFrom: string;
    rangeTo: string;
    interval: string;
  };
  http: HttpSetup;
}

export async function getThresholdRuleVisualizationData({
  model,
  visualizeOptions,
  http,
}: GetThresholdRuleVisualizationDataParams): Promise<TimeSeriesResult> {
  const timeSeriesQueryParams = {
    index: model.index,
    timeField: model.timeField,
    aggType: model.aggType,
    aggField: model.aggField,
    groupBy: model.groupBy,
    termField: model.termField,
    termSize: model.termSize,
    timeWindowSize: model.timeWindowSize,
    timeWindowUnit: model.timeWindowUnit,
    filterKuery: model.filterKuery,
    dateStart: new Date(visualizeOptions.rangeFrom).toISOString(),
    dateEnd: new Date(visualizeOptions.rangeTo).toISOString(),
    interval: visualizeOptions.interval,
  };

  return await http.post<TimeSeriesResult>(`${INDEX_THRESHOLD_DATA_API_ROOT}/_time_series_query`, {
    body: JSON.stringify(timeSeriesQueryParams),
  });
}
