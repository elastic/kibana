/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest } from '../../types';
import { checkParam } from '../error_missing_required';
import { createEnterpriseSearchQuery } from './create_enterprise_search_query';
import {
  entSearchAggFilterPath,
  entSearchUuidsAgg,
  entSearchAggResponseHandler,
} from './_enterprise_search_stats';

export async function getStats(
  req: LegacyRequest,
  entSearchIndexPattern: string,
  clusterUuid: string
) {
  checkParam(entSearchIndexPattern, 'entSearchIndexPattern in getStats');

  const config = req.server.config();
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();
  const maxBucketSize = config.get('monitoring.ui.max_bucket_size');

  const params = {
    index: entSearchIndexPattern,
    filter_path: entSearchAggFilterPath,
    size: 0,
    ignore_unavailable: true,
    body: {
      query: createEnterpriseSearchQuery({
        start,
        end,
        uuid: clusterUuid,
      }),
      aggs: entSearchUuidsAgg(maxBucketSize!),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response: ElasticsearchResponse = await callWithRequest(req, 'search', params);

  return entSearchAggResponseHandler(response);
}
