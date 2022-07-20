/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  rangeQuery,
  kqlQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Setup } from '../../../lib/helpers/setup_request';
import { getBucketSize } from '../../../lib/helpers/get_bucket_size';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';

async function getTopErroneousTransactions({
  environment,
  kuery,
  serviceName,
  groupId,
  setup,
  start,
  end,
  numBuckets,
  offset,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  groupId: string;
  setup: Setup;
  start: number;
  end: number;
  numBuckets: number;
  offset?: string;
}) {
  const { apmEventClient } = setup;

  const { startWithOffset, endWithOffset, offsetInMs } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    numBuckets,
  });

  const res = await apmEventClient.search('get_top_erroneous_transactions', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(ERROR_GROUP_ID, groupId),
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        top_five_transactions: {
          terms: {
            field: TRANSACTION_NAME,
            size: 5,
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                _source: [TRANSACTION_TYPE],
              },
            },
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                extended_bounds: {
                  min: startWithOffset,
                  max: endWithOffset,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    res.aggregations?.top_five_transactions.buckets.map(
      ({ key, doc_count: docCount, sample, timeseries }) => ({
        transactionName: key as string,
        transactionType: sample.hits.hits[0]._source.transaction?.type,
        occurrences: docCount,
        timeseries: timeseries.buckets.map((timeseriesBucket) => {
          return {
            x: timeseriesBucket.key + offsetInMs,
            y: timeseriesBucket.doc_count,
          };
        }),
      })
    ) ?? []
  );
}

export async function getTopErroneousTransactionsPeriods({
  kuery,
  serviceName,
  setup,
  numBuckets,
  groupId,
  environment,
  start,
  end,
  offset,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  numBuckets: number;
  groupId: string;
  environment: string;
  start: number;
  end: number;
  offset?: string;
}) {
  const [currentPeriod, previousPeriod] = await Promise.all([
    getTopErroneousTransactions({
      environment,
      kuery,
      serviceName,
      setup,
      numBuckets,
      groupId,
      start,
      end,
    }),
    offset
      ? getTopErroneousTransactions({
          environment,
          kuery,
          serviceName,
          setup,
          numBuckets,
          groupId,
          start,
          end,
          offset,
        })
      : [],
  ]);

  const previousPeriodByTransactionName = keyBy(
    previousPeriod,
    'transactionName'
  );

  return {
    topErroneousTransactions: currentPeriod.map(
      ({ transactionName, timeseries: currentPeriodTimeseries, ...rest }) => {
        return {
          ...rest,
          transactionName,
          currentPeriodTimeseries,
          previousPeriodTimeseries:
            previousPeriodByTransactionName[transactionName]?.timeseries ?? [],
        };
      }
    ),
  };
}
