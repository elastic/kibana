/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetchAbortable } from 'ui/kfetch';
import { SearchError, getSearchErrorType } from 'ui/courier';

function serializeFetchParams(searchRequestsWithFetchParams) {
  return JSON.stringify(searchRequestsWithFetchParams.map(searchRequestWithFetchParams => {
    const indexPattern = searchRequestWithFetchParams.index.title || searchRequestWithFetchParams.index;
    const {
      body: {
        size,
        aggs,
        query: _query,
      },
    } = searchRequestWithFetchParams;

    const query = {
      'size': size,
      'aggregations': aggs,
      'query': _query,
    };

    return { index: indexPattern, query };
  }));
}

// Rollup search always returns 0 hits, but visualizations expect search responses
// to return hits > 0, otherwise they do not render. We fake the number of hits here
// by counting the number of aggregation buckets/values returned by rollup search.
function shimHitsInFetchResponse(response) {
  return response.map(result => {
    const buckets = result.aggregations ? Object.keys(result.aggregations).reduce((allBuckets, agg) => {
      return allBuckets.concat(result.aggregations[agg].buckets || [result.aggregations[agg].value] || []);
    }, []) : [];
    return buckets && buckets.length ? {
      ...result,
      hits: {
        ...result.hits,
        total: buckets.length
      }
    } : result;
  });
}

export const rollupSearchStrategy = {
  id: 'rollup',

  search: async ({ searchRequests }) => {
    // Flatten the searchSource within each searchRequest to get the fetch params,
    // e.g. body, filters, index pattern, query.
    const allFetchParams = searchRequests.map(searchRequest => searchRequest.getFetchParams());

    // Serialize the fetch params into a format suitable for the body of an ES query.
    const serializedFetchParams = serializeFetchParams(allFetchParams);

    const {
      fetching,
      abort,
    } = kfetchAbortable({
      pathname: '../api/rollup/search',
      method: 'POST',
      body: serializedFetchParams,
    });

    return {
      searching: fetching
        .then(result => shimHitsInFetchResponse(result))
        .catch(error => {
          const {
            body: { statusText, error: title, message },
            res: { url },
          } = error;

          // Format kfetch error as a SearchError.
          throw new SearchError({
            status: statusText,
            title,
            message: `Rollup search error: ${message}`,
            path: url,
            type: getSearchErrorType({ message }),
          });
        }),
      abort,
    };
  },

  isViable: (indexPattern) => {
    if (!indexPattern) {
      return false;
    }

    return indexPattern.type === 'rollup';
  },
};
