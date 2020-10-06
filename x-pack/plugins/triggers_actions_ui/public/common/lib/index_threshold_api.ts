/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import { TimeSeriesResult } from '../../../../stack_alerts/common/alert_types/index_threshold';

const INDEX_THRESHOLD_API_ROOT = '/api/stack_alerts/index_threshold';

export async function getMatchingIndicesForThresholdAlertType({
  pattern,
  http,
}: {
  pattern: string;
  http: HttpSetup;
}): Promise<Record<string, any>> {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const { indices } = await http.post(`${INDEX_THRESHOLD_API_ROOT}/_indices`, {
    body: JSON.stringify({ pattern }),
  });
  return indices;
}

export async function getThresholdAlertTypeFields({
  indexes,
  http,
}: {
  indexes: string[];
  http: HttpSetup;
}): Promise<Record<string, any>> {
  const { fields } = await http.post(`${INDEX_THRESHOLD_API_ROOT}/_fields`, {
    body: JSON.stringify({ indexPatterns: indexes }),
  });
  return fields;
}

let savedObjectsClient: any;

export const setSavedObjectsClient = (aSavedObjectsClient: any) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => {
  return savedObjectsClient;
};

export const loadIndexPatterns = async () => {
  const { savedObjects } = await getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });
  return savedObjects;
};

interface GetThresholdAlertVisualizationDataParams {
  model: any;
  visualizeOptions: any;
  http: HttpSetup;
}

export async function getThresholdAlertVisualizationData({
  model,
  visualizeOptions,
  http,
}: GetThresholdAlertVisualizationDataParams): Promise<TimeSeriesResult> {
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
    dateStart: new Date(visualizeOptions.rangeFrom).toISOString(),
    dateEnd: new Date(visualizeOptions.rangeTo).toISOString(),
    interval: visualizeOptions.interval,
  };

  return await http.post<TimeSeriesResult>(`${INDEX_THRESHOLD_API_ROOT}/_time_series_query`, {
    body: JSON.stringify(timeSeriesQueryParams),
  });
}
