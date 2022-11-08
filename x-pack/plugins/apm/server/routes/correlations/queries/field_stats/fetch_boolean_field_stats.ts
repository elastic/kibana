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
import { BooleanFieldStats } from '../../../../../common/correlations/field_stats_types';
import { getCommonCorrelationsQuery } from '../get_common_correlations_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export const fetchBooleanFieldStats = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  field,
  query,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
  field: FieldValuePair;
}): Promise<BooleanFieldStats> => {
  const { fieldName } = field;

  const { aggregations } = await apmEventClient.search(
    'get_boolean_field_stats',
    {
      apm: {
        events: [eventType],
      },
      body: {
        size: 0,
        track_total_hits: false,
        query: getCommonCorrelationsQuery({
          start,
          end,
          environment,
          kuery,
          query,
        }),
        aggs: {
          sampled_value_count: {
            filter: { exists: { field: fieldName } },
          },
          sampled_values: {
            terms: {
              field: fieldName,
              size: 2,
            },
          },
        },
      },
    }
  );

  const stats: BooleanFieldStats = {
    fieldName: field.fieldName,
    count: aggregations?.sampled_value_count.doc_count ?? 0,
  };

  const valueBuckets = aggregations?.sampled_values?.buckets ?? [];
  valueBuckets.forEach((bucket) => {
    stats[`${bucket.key.toString()}Count`] = bucket.doc_count;
  });
  return stats;
};
