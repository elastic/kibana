/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

async function parseResponse(request) {
  const response = await request;
  if (!response._scroll_id) {
    throw new Error('Expected _scroll_id in the following Elasticsearch response: ' + JSON.stringify(response));
  }

  if (!response.hits) {
    throw new Error('Expected hits in the following Elasticsearch response: ' + JSON.stringify(response));
  }

  return {
    scrollId: response._scroll_id,
    hits: response.hits.hits
  };
}

export function createHitIterator(logger) {
  return async function* hitIterator(scrollSettings, callEndpoint, searchRequest, cancellationToken) {
    logger('executing search request');
    function search(index, body) {
      return parseResponse(callEndpoint('search', {
        index,
        body,
        scroll: scrollSettings.duration,
        size: scrollSettings.size
      }));
    }

    function scroll(scrollId) {
      logger('executing scroll request');
      return parseResponse(callEndpoint('scroll', {
        scrollId,
        scroll: scrollSettings.duration
      }));
    }

    function clearScroll(scrollId) {
      logger('executing clearScroll request');
      return callEndpoint('clearScroll', {
        scrollId: [ scrollId ]
      });
    }

    let { scrollId, hits } = await search(searchRequest.index, searchRequest.body);
    try {
      while(hits.length && !cancellationToken.isCancelled) {
        for(const hit of hits) {
          yield hit;
        }

        ({ scrollId, hits } = await scroll(scrollId));
      }
    } finally {
      await clearScroll(scrollId);
    }
  };
}


