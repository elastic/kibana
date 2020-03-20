/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { INDEX_NAMES } from '../../../../../legacy/plugins/uptime/common/constants';
import { StatesIndexStatus } from '../../../../../legacy/plugins/uptime/common/runtime_types';

export const getIndexStatus: UMElasticsearchQueryFn<{}, StatesIndexStatus> = async ({ callES }) => {
  const {
    _shards: { total },
    count,
  } = await callES('count', { index: INDEX_NAMES.HEARTBEAT });
  return {
    indexExists: total > 0,
    docCount: count,
  };
};
