/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { getApmIndexPatterns } from './get_indices';

export function getFieldCaps({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
}) {
  return esClient.fieldCaps({
    index: getApmIndexPatterns([apmIndices.metric, apmIndices.transaction]),
    fields: [SERVICE_NAME],
    filter_path: ['fields'],
    filters: '-parent',
    include_unmapped: true,
    ignore_unavailable: true,
  });
}
