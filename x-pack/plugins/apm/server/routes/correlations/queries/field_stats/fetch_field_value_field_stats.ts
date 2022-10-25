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
import {
  FieldValueFieldStats,
  TopValueBucket,
} from '../../../../../common/correlations/field_stats_types';
import { getCommonCorrelationsQuery } from '../get_common_correlations_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export const fetchFieldValueFieldStats = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  field,
}: CommonCorrelationsQueryParams & {
  eventType: ProcessorEvent;
  apmEventClient: APMEventClient;
  field: FieldValuePair;
}): Promise<FieldValueFieldStats> => {
  const { aggregations } = await apmEventClient.search(
    'get_field_value_field_stats',
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
          filtered_count: {
            filter: {
              term: {
                [`${field?.fieldName}`]: field?.fieldValue,
              },
            },
          },
        },
      },
    }
  );

  const topValues: TopValueBucket[] = [
    {
      key: field.fieldValue,
      doc_count: aggregations?.filtered_count.doc_count ?? 0,
    },
  ];

  const stats = {
    fieldName: field.fieldName,
    topValues,
    topValuesSampleSize: aggregations?.filtered_count.doc_count ?? 0,
  };

  return stats;
};
