/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { kfetchAbortable } from 'ui/kfetch';
import { SearchError } from 'ui/courier';

export const rollupSearchStrategy = {
  id: 'rollup',

  search: async ({ searchRequests, Promise }) => {
    // TODO: Batch together requests to hit a bulk rollup search endpoint.
    const searchRequest = searchRequests[0];
    const searchParams = await searchRequest.getFetchParams();
    const indexPattern = searchParams.index.title || searchParams.index;
    const {
      body: {
        size,
        aggs,
        query: _query,
      },
    } = searchParams;

    // TODO: Temporarily automatically assign same timezone and interval as what's defined by
    // the rollup job. This should be done by the visualization itself.
    Object.keys(aggs).forEach(aggName => {
      const subAggs = aggs[aggName];

      Object.keys(subAggs).forEach(subAggName => {
        if (subAggName === 'date_histogram') {
          const dateHistogramAgg = searchRequest.source.getField('index').typeMeta.aggs.date_histogram;
          const subAgg = subAggs[subAggName];
          const field = subAgg.field;
          subAgg.time_zone = dateHistogramAgg[field].time_zone;
          subAgg.interval = dateHistogramAgg[field].interval;
        }
      });
    });

    const index = indexPattern;
    const query = {
      'size': size,
      'aggregations': aggs,
      'query': _query,
    };

    const {
      fetching,
      abort,
    } = kfetchAbortable({
      pathname: '../api/rollup/search',
      method: 'POST',
      body: JSON.stringify({ index, query }),
    });

    // TODO: Implement this. Search requests which can't be sent.
    const failedSearchRequests = [];

    return {
      // Munge data into shape expected by consumer.
      searching: new Promise((resolve, reject) => {
        fetching.then(result => {
          resolve([ result ]);
        }).catch(error => {
          const {
            body: { statusText, error: title, message },
            res: { url },
          } = error;

          // Format kfetch error as a SearchError.
          const searchError = new SearchError({
            status: statusText,
            title,
            message,
            path: url,
          });

          reject(searchError);
        });
      }),
      abort,
      failedSearchRequests,
    };
  },

  isViable: (indexPattern) => {
    if (!indexPattern) {
      return false;
    }

    return indexPattern.type === 'rollup';
  },
};
