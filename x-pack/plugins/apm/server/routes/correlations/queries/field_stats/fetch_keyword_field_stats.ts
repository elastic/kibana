/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../../common/correlations/types';
import { KeywordFieldStats } from '../../../../../common/correlations/field_stats_types';
import { getCommonCorrelationsQuery } from '../get_common_correlations_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export const fetchKeywordFieldStats = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  field,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
  field: FieldValuePair;
}): Promise<KeywordFieldStats> => {
  const body = await apmEventClient.search('get_keyword_field_stats', {
    apm: {
      events: [eventType],
    },
    body: {
      size: 0,
      track_total_hits: false,
      query: getCommonCorrelationsQuery({
        start,
        end,
        kuery,
        environment,
        query,
      }),
      aggs: {
        sampled_top: {
          terms: {
            field: field.fieldName,
            size: 10,
          },
        },
      },
    },
  });

  const aggregations = body.aggregations;
  const topValues = aggregations?.sampled_top?.buckets ?? [];

  const stats = {
    fieldName: field.fieldName,
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc, curr) => acc + curr.doc_count,
      aggregations?.sampled_top?.sum_other_doc_count ?? 0
    ),
  };

  return stats;
};
