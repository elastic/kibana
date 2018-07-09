/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function getAnomalyAggs({
  serviceName,
  transactionType,
  intervalString,
  client,
  start,
  end
}) {
  const params = {
    index: `.ml-anomalies-${serviceName}-${transactionType}-high_mean_response_time`.toLowerCase(),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
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
        top_hits: {
          top_hits: {
            sort: ['bucket_span'],
            _source: { includes: ['bucket_span'] },
            size: 1
          }
        },
        ml_avg_response_times: {
          date_histogram: {
            field: 'timestamp',
            interval: intervalString,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end
            }
          },
          aggs: {
            anomaly_score: { max: { field: 'anomaly_score' } },
            lower: { min: { field: 'model_lower' } },
            upper: { max: { field: 'model_upper' } }
          }
        }
      }
    }
  };

  try {
    const resp = await client('search', params);
    return resp.aggregations;
  } catch (e) {
    if (e.statusCode === 404) {
      return null;
    }
    throw e;
  }
}
