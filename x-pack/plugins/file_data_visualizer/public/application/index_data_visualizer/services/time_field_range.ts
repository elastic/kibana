/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IndicesOptions } from '../../../../common/types/indices';
import { lazyLoadModules } from '../../../lazy_load_bundle';
import { GetTimeFieldRangeResponse } from '../../../../common/types/time_field_request';
import { basePath } from './visualizer_stats';

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
}): Promise<GetTimeFieldRangeResponse> {
  const body = JSON.stringify({ index, timeFieldName, query, runtimeMappings, indicesOptions });
  const fileUploadModules = await lazyLoadModules();

  return await fileUploadModules.getHttp().fetch<GetTimeFieldRangeResponse>({
    path: `${basePath()}/fields_service/time_field_range`,
    method: 'POST',
    body,
  });
}
