/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
} from '../../../common/elasticsearch_fieldnames';
import { getErrorGroupsProjection } from '../../projections/errors';
import { mergeProjection } from '../../projections/util/merge_projection';
import { getErrorName } from '../helpers/get_error_name';
import { Setup } from '../helpers/setup_request';

export async function getErrorGroups({
  environment,
  kuery,
  serviceName,
  sortField,
  sortDirection = 'desc',
  setup,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  // sort buckets by last occurrence of error
  const sortByLatestOccurrence = sortField === 'latestOccurrenceAt';

  const projection = getErrorGroupsProjection({
    environment,
    kuery,
    serviceName,
    start,
    end,
  });

  const order = sortByLatestOccurrence
    ? {
        max_timestamp: sortDirection,
      }
    : { _count: sortDirection };

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        error_groups: {
          terms: {
            ...projection.body.aggs.error_groups.terms,
            size: 500,
            order,
          },
          aggs: {
            sample: {
              top_hits: {
                _source: [
                  ERROR_LOG_MESSAGE,
                  ERROR_EXC_MESSAGE,
                  ERROR_EXC_HANDLED,
                  ERROR_EXC_TYPE,
                  ERROR_CULPRIT,
                  ERROR_GROUP_ID,
                  '@timestamp',
                ],
                sort: [{ '@timestamp': 'desc' as const }],
                size: 1,
              },
            },
            ...(sortByLatestOccurrence
              ? {
                  max_timestamp: {
                    max: {
                      field: '@timestamp',
                    },
                  },
                }
              : {}),
          },
        },
      },
    },
  });

  const resp = await apmEventClient.search('get_error_groups', params);

  // aggregations can be undefined when no matching indices are found.
  // this is an exception rather than the rule so the ES type does not account for this.
  const hits = (resp.aggregations?.error_groups.buckets || []).map((bucket) => {
    const source = bucket.sample.hits.hits[0]._source;
    const message = getErrorName(source);

    return {
      message,
      occurrenceCount: bucket.doc_count,
      culprit: source.error.culprit,
      groupId: source.error.grouping_key,
      latestOccurrenceAt: source['@timestamp'],
      handled: source.error.exception?.[0].handled,
      type: source.error.exception?.[0].type,
    };
  });

  return hits;
}
