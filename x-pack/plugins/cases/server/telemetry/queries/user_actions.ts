/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { Buckets, CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getCountsAggregationQuery, getCountsFromBuckets } from './utils';

export const getUserActionsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['userActions']> => {
  const res = await savedObjectsClient.find<
    unknown,
    { counts: Buckets; references: { cases: { max_user_actions: { value: number } } } }
  >({
    page: 0,
    perPage: 0,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    aggs: {
      ...getCountsAggregationQuery(CASE_USER_ACTION_SAVED_OBJECT),
      references: {
        nested: {
          path: `${CASE_USER_ACTION_SAVED_OBJECT}.references`,
        },
        aggregations: {
          cases: {
            filter: {
              term: {
                [`${CASE_USER_ACTION_SAVED_OBJECT}.references.type`]: CASE_SAVED_OBJECT,
              },
            },
            aggregations: {
              ids: {
                terms: {
                  field: `${CASE_USER_ACTION_SAVED_OBJECT}.references.id`,
                },
              },
              max_user_actions: {
                max_bucket: {
                  buckets_path: 'ids._count',
                },
              },
            },
          },
        },
      },
    },
  });

  const countsBuckets = res.aggregations?.counts?.buckets ?? [];
  const maxOnACase = res.aggregations?.references?.cases.max_user_actions.value ?? 0;

  return {
    all: {
      total: 0,
      ...getCountsFromBuckets(countsBuckets),
    },
    maxOnACase,
  };
};
