/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_ID,
  SPAN_START,
  SPAN_TYPE,
  PROCESSOR_EVENT
} from '../../../../common/constants';

async function getSpans({ transactionId, setup }) {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get('xpack.apm.indexPattern'),
    body: {
      size: 500,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            },
            { term: { [TRANSACTION_ID]: transactionId } },
            { term: { [PROCESSOR_EVENT]: 'span' } }
          ]
        }
      },
      sort: [{ [SPAN_START]: { order: 'asc' } }],
      aggs: {
        types: {
          terms: {
            field: SPAN_TYPE,
            size: 100
          }
        }
      }
    }
  };

  const resp = await client('search', params);
  return {
    span_types: resp.aggregations.types.buckets.map(bucket => ({
      type: bucket.key,
      count: bucket.doc_count
    })),
    spans: resp.hits.hits.map((doc, i) => ({
      doc_id: doc._id,
      id: i,
      ...doc._source.span,
      context: doc._source.context
    }))
  };
}

export default getSpans;
