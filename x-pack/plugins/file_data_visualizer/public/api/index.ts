/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lazyLoadModules } from '../lazy_load_bundle';
import { FileDataVisualizer } from '../application';
import { FieldHistogramRequestConfig, FieldRequestConfig } from '../../common/types';
import { GetTimeFieldRangeResponse } from '../../common/types/time_field_request';
import { IndicesOptions } from '../../common/types/indices';

export async function getFileDataVisualizerComponent(): Promise<typeof FileDataVisualizer> {
  const modules = await lazyLoadModules();
  return modules.FileDataVisualizer;
}

export function basePath() {
  return '/api/ml';
}

export async function getVisualizerOverallStats({
  indexPatternTitle,
  query,
  timeFieldName,
  earliest,
  latest,
  samplerShardSize,
  aggregatableFields,
  nonAggregatableFields,
  runtimeMappings,
}: {
  indexPatternTitle: string;
  query: any;
  timeFieldName?: string;
  earliest?: number;
  latest?: number;
  samplerShardSize?: number;
  aggregatableFields: string[];
  nonAggregatableFields: string[];
  runtimeMappings?: estypes.RuntimeFields;
}) {
  const body = JSON.stringify({
    query,
    timeFieldName,
    earliest,
    latest,
    samplerShardSize,
    aggregatableFields,
    nonAggregatableFields,
    runtimeMappings,
  });

  const fileUploadModules = await lazyLoadModules();
  // @todo: update
  return await fileUploadModules.getHttp().fetch<any>({
    path: `${basePath()}/data_visualizer/get_overall_stats/${indexPatternTitle}`,
    method: 'POST',
    body,
  });
}

export async function getVisualizerFieldStats({
  indexPatternTitle,
  query,
  timeFieldName,
  earliest,
  latest,
  samplerShardSize,
  interval,
  fields,
  maxExamples,
  runtimeMappings,
}: {
  indexPatternTitle: string;
  query: any;
  timeFieldName?: string;
  earliest?: number;
  latest?: number;
  samplerShardSize?: number;
  interval?: number;
  fields?: FieldRequestConfig[];
  maxExamples?: number;
  runtimeMappings?: estypes.RuntimeFields;
}) {
  const body = JSON.stringify({
    query,
    timeFieldName,
    earliest,
    latest,
    samplerShardSize,
    interval,
    fields,
    maxExamples,
    runtimeMappings,
  });

  const fileUploadModules = await lazyLoadModules();
  // @todo: update
  return await fileUploadModules.getHttp().fetch<any>({
    path: `${basePath()}/data_visualizer/get_field_stats/${indexPatternTitle}`,
    method: 'POST',
    body,
  });
}

export async function getVisualizerFieldHistograms({
  indexPatternTitle,
  query,
  fields,
  samplerShardSize,
  runtimeMappings,
}: {
  indexPatternTitle: string;
  query: any;
  fields: FieldHistogramRequestConfig[];
  samplerShardSize?: number;
  runtimeMappings?: estypes.RuntimeFields;
}) {
  const body = JSON.stringify({
    query,
    fields,
    samplerShardSize,
    runtimeMappings,
  });

  const fileUploadModules = await lazyLoadModules();
  // @todo: update type
  return await fileUploadModules.getHttp().fetch<any>({
    path: `${basePath()}/data_visualizer/get_field_histograms/${indexPatternTitle}`,
    method: 'POST',
    body,
  });
}

export async function getTimeFieldRange({
  index,
  timeFieldName,
  query,
  runtimeMappings,
  indicesOptions,
}: {
  index: string;
  timeFieldName?: string;
  query: any;
  runtimeMappings?: estypes.RuntimeFields;
  indicesOptions?: IndicesOptions;
}) {
  const body = JSON.stringify({ index, timeFieldName, query, runtimeMappings, indicesOptions });
  const fileUploadModules = await lazyLoadModules();

  return await fileUploadModules.getHttp().fetch<GetTimeFieldRangeResponse>({
    path: `${basePath()}/fields_service/time_field_range`,
    method: 'POST',
    body,
  });
}
