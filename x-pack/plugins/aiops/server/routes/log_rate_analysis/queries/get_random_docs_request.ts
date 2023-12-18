/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { AiopsLogRateAnalysisSchema } from '../../../../common/api/log_rate_analysis/schema';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

const POPULATED_DOC_COUNT_SAMPLE_SIZE = 1000;

export const getRandomDocsRequest = (
  params: AiopsLogRateAnalysisSchema
): estypes.SearchRequest => ({
  ...getRequestBase(params),
  body: {
    fields: ['*'],
    _source: false,
    query: {
      function_score: {
        query: getQueryWithParams({ params }),
        // @ts-ignore
        random_score: {},
      },
    },
    size: POPULATED_DOC_COUNT_SAMPLE_SIZE,
    // Used to determine sample probability for follow up queries
    track_total_hits: true,
  },
});
