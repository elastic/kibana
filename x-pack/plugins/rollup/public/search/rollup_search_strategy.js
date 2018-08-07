/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { kfetchAbortable } from 'ui/kfetch';
import { SearchError } from 'ui/courier';

function getAllFetchParams(searchRequests, Promise) {
  return Promise.map(searchRequests, (searchRequest) => {
    return Promise.try(searchRequest.getFetchParams, void 0, searchRequest)
      .then((fetchParams) => {
        return (searchRequest.fetchParams = fetchParams);
      })
      .then(value => ({ resolved: value }))
      .catch(error => ({ rejected: error }));
  });
}

async function serializeAllFetchParams(fetchParams, searchRequests) {
  const searchRequestsWithFetchParams = [];
  const failedSearchRequests = [];

  // Gather the fetch param responses from all the successful requests.
  fetchParams.forEach((result, index) => {
    if (result.resolved) {
      searchRequestsWithFetchParams.push(result.resolved);
    } else {
      const searchRequest = searchRequests[index];

      searchRequest.handleFailure(result.rejected);
      failedSearchRequests.push(searchRequest);
    }
  });

  const serializedFetchParams = serializeFetchParams(searchRequestsWithFetchParams);

  return {
    serializedFetchParams,
    failedSearchRequests,
  };
}

function serializeFetchParams(searchRequestsWithFetchParams) {
  return JSON.stringify(searchRequestsWithFetchParams.map(searchRequestWithFetchParams => {
    const indexPattern = searchRequestWithFetchParams.index.title || searchRequestWithFetchParams.index;
    const {
      body: {
        size,
        aggs,
        query: _query,
      },
      index,
    } = searchRequestWithFetchParams;

    // TODO: Temporarily automatically assign same timezone and interval as what's defined by
    // the rollup job. This should be done by the visualization itself.
    Object.keys(aggs).forEach(aggName => {
      const subAggs = aggs[aggName];

      Object.keys(subAggs).forEach(subAggName => {
        if (subAggName === 'date_histogram') {
          const dateHistogramAgg = index.typeMeta.aggs.date_histogram;
          const subAgg = subAggs[subAggName];
          const field = subAgg.field;
          subAgg.time_zone = dateHistogramAgg[field].time_zone;
          subAgg.interval = dateHistogramAgg[field].interval;
        }
      });
    });

    const query = {
      'size': size,
      'aggregations': aggs,
      'query': _query,
    };

    return { index: indexPattern, query };
  }));
}

export const rollupSearchStrategy = {
  id: 'rollup',

  search: async ({ searchRequests, Promise }) => {
    // Flatten the searchSource within each searchRequest to get the fetch params,
    // e.g. body, filters, index pattern, query.
    const allFetchParams = await getAllFetchParams(searchRequests, Promise);

    // Serialize the fetch params into a format suitable for the body of an ES query.
    const {
      serializedFetchParams,
      failedSearchRequests,
    } = await serializeAllFetchParams(allFetchParams, searchRequests);

    const {
      fetching,
      abort,
    } = kfetchAbortable({
      pathname: '../api/rollup/search',
      method: 'POST',
      body: serializedFetchParams,
    });

    return {
      searching: new Promise((resolve, reject) => {
        fetching.then(result => {
          resolve(result);
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
