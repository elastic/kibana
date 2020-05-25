/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESFilter } from '../../../typings/elasticsearch';
import {
  SERVICE_NAME,
  PROCESSOR_EVENT,
  ERROR_GROUP_ID
} from '../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import { rangeFilter } from '../helpers/range_filter';
import { BUCKET_TARGET_COUNT } from '../transactions/constants';

// TODO: refactor
function getBucketSize({ start, end }: SetupTimeRange) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
}

export async function getErrorRate({
  serviceName,
  groupId,
  setup
}: {
  serviceName: string;
  groupId?: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, client, indices } = setup;
  const bucketSize = getBucketSize({ start, end });
  const groupIdTerm = groupId ? [{ term: { [ERROR_GROUP_ID]: groupId } }] : [];

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    {
      bool: {
        should: [
          { term: { [PROCESSOR_EVENT]: 'transaction' } },
          {
            bool: {
              filter: [{ term: { [PROCESSOR_EVENT]: 'error' } }, ...groupIdTerm]
            }
          }
        ]
      }
    },
    ...uiFiltersES
  ];

  const aggs = {
    count: {
      histogram: {
        field: '@timestamp',
        min_doc_count: 0,
        interval: bucketSize,
        extended_bounds: {
          min: start,
          max: end
        }
      },
      aggs: {
        processorEventCount: {
          terms: {
            field: PROCESSOR_EVENT,
            size: 10
          }
        }
      }
    }
  };

  const params = {
    index: [
      indices['apm_oss.errorIndices'],
      indices['apm_oss.transactionIndices']
    ],
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs
    }
  };

  const resp = await client.search(params);
  return resp.aggregations?.count.buckets.map(histogram => {
    const {
      transaction: transactionCount = 1,
      error: errorCount = 0
    } = histogram.processorEventCount.buckets.reduce(
      (acc, { key, doc_count }) => ({ ...acc, [key]: doc_count }),
      {} as { transaction?: number; error?: number }
    );

    return {
      x: histogram.key,
      y: errorCount / transactionCount
    };
  });
}
