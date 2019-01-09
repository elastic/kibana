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

  const filters = [unlinkedDeploymentFilter];
  // Not every page will contain a time range so check for that
  if (req.payload.timeRange) {
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
    filters.push(timeRangeFilter);
  }

  const msearch = indexPatternList.reduce((msearch, indexPattern) => {
    msearch.push({
      index: indexPattern,
    });
    msearch.push({
      size: 0,
      query: {
        bool: {
          filter: filters,
        }
      }
    });
    return msearch;
  }, []);

  const params = {
    body: msearch
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'msearch', params);

  if (!response.responses) {
    return false;
  }

  return response.responses.reduce((hasAny, response) => hasAny || response.hits.total > 0, false);
}
