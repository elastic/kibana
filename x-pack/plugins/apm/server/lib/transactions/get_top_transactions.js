/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_ID,
  TRANSACTION_DURATION
} from '../../../common/constants';
import { get, sortBy } from 'lodash';

export async function getTopTransactions({
  transactionType,
  serviceName,
  setup
}) {
  const { start, end, client, config } = setup;

  const duration = moment.duration(end - start);
  const minutes = duration.asMinutes();

  const params = {
    index: config.get('xpack.apm.indexPattern'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      },
      aggs: {
        transactions: {
          terms: {
            field: `${TRANSACTION_NAME}.keyword`,
            order: { avg: 'desc' },
            size: 100
          },
          aggs: {
            sample: {
              top_hits: {
                _source: [TRANSACTION_ID],
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' } }]
              }
            },
            avg: {
              avg: { field: TRANSACTION_DURATION }
            },
            p95: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [95]
              }
            }
          }
        }
      }
    }
  };

  const resp = await client('search', params);
  const buckets = get(resp, 'aggregations.transactions.buckets', []);
  const results = buckets.map(bucket => {
    const avg = bucket.avg.value;
    const tpm = bucket.doc_count / minutes;
    const impact = Math.round(avg * tpm);
    return {
      name: bucket.key,
      id: get(bucket, `sample.hits.hits[0]._source.${TRANSACTION_ID}`),
      p95: bucket.p95.values['95.0'],
      avg,
      tpm,
      impact,
      transaction_type: transactionType
    };
  });

  // Sort results by impact - needs to be desc, hence the reverse()
  return sortBy(results, o => o.impact).reverse();
}
