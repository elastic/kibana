/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with near duplicate service in
// `x-pack/plugins/data_visualizer/public/application/index_data_visualizer/services/time_field_range.ts`

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { HttpStart } from '@kbn/core/public';

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}

export async function getTimeFieldRange({
  index,
  timeFieldName,
  query,
  runtimeMappings,
  http,
}: {
  index: string;
  timeFieldName?: string;
  query?: QueryDslQueryContainer;
  runtimeMappings?: estypes.MappingRuntimeFields;
  http: HttpStart;
}) {
  const body = JSON.stringify({ index, timeFieldName, query, runtimeMappings });

  return await http.fetch<GetTimeFieldRangeResponse>({
    path: `/internal/file_upload/time_field_range`,
    method: 'POST',
    body,
  });
}
