/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { unlinkedDeploymentFilter } from './';

export async function hasUnlinkedDeployments(req, indexPatterns) {
  const indexPatternList = indexPatterns.reduce((list, patterns) => {
    list.push(...patterns.split(','));
    return list;
  }, []);

  // Get the params from the POST body for the request
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  const timeRangeFilter = {
    range: {
      timestamp: {
        format: 'epoch_millis'
      }
    }
  };

  if (start) {
    timeRangeFilter.range.timestamp.gte = moment.utc(start).valueOf();
  }
  if (end) {
    timeRangeFilter.range.timestamp.lte = moment.utc(end).valueOf();
  }

  const msearch = indexPatternList.reduce((msearch, indexPattern) => {
    msearch.push({
      index: indexPattern,
    });
    msearch.push({
      size: 1,
      query: {
        bool: {
          filter: [ timeRangeFilter ],
          must: [{
            bool: unlinkedDeploymentFilter
          }]
        }
      }
    });
    return msearch;
  }, []);

  const params = {
    filterPath: [
      'responses.hits.hits._index',
    ],
    body: msearch
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'msearch', params);

  if (!response.responses) {
    return false;
  }

  const nonClusterCount = response.responses.reduce((total, response) => {
    total += response.hits.hits.length;
    return total;
  }, 0);

  return nonClusterCount > 0;
}
