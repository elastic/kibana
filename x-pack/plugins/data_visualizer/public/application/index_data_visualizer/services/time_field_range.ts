/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { lazyLoadModules } from '../../../lazy_load_bundle';
import { GetTimeFieldRangeResponse } from '../../../../common/types/time_field_request';
import { Query } from '../../../../../../../src/plugins/data/common/query';

export async function getTimeFieldRange({
  index,
  timeFieldName,
  query,
  runtimeMappings,
}: {
  index: string;
  timeFieldName?: string;
  query?: Query;
  runtimeMappings?: estypes.MappingRuntimeFields;
}) {
  const body = JSON.stringify({ index, timeFieldName, query, runtimeMappings });
  const fileUploadModules = await lazyLoadModules();

  return await fileUploadModules.getHttp().fetch<GetTimeFieldRangeResponse>({
    path: `/internal/file_upload/time_field_range`,
    method: 'POST',
    body,
  });
}
