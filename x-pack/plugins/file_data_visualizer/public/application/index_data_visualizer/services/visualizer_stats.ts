/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lazyLoadModules } from '../../../lazy_load_bundle';
import type { FieldHistogramRequestConfig, FieldRequestConfig } from '../../../../common/types';

export function basePath() {
  // @todo: change to internal/data_visualizer
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
