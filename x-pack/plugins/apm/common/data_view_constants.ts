/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DO_NOT_USE_LEGACY_APM_STATIC_DATA_VIEW_ID =
  'apm_static_index_pattern_id';

const APM_STATIC_DATA_VIEW_ID_PREFIX = 'apm_static_data_view_id';

export function getDataViewId(spaceId: string) {
  return `${APM_STATIC_DATA_VIEW_ID_PREFIX}_${spaceId}`;
}
