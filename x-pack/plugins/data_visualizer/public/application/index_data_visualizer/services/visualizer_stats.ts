/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lazyLoadModules } from '../../../lazy_load_bundle';
import type { DocumentCounts, FieldRequestConfig, FieldVisStats } from '../../../../common/types';
import { OverallStats } from '../types/overall_stats';

export function basePath() {
  return '/internal/data_visualizer';
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
  runtimeMappings?: estypes.MappingRuntimeFields;
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
  return await fileUploadModules.getHttp().fetch<OverallStats>({
    path: `${basePath()}/get_overall_stats/${indexPatternTitle}`,
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
  runtimeMappings?: estypes.MappingRuntimeFields;
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
  return await fileUploadModules.getHttp().fetch<[DocumentCounts, FieldVisStats]>({
    path: `${basePath()}/get_field_stats/${indexPatternTitle}`,
    method: 'POST',
    body,
  });
}
