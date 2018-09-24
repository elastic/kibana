/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

/*
 * @param {Object} response: Elasticsearch response for an aggregation
 * @param {string} aggregationBucketName: the aggregation bucket to grab the data from.
 * @return {Object} An object that has a field for the total number of hits, and a nested
 * field for each unique field found in the reporting data along with the count of
 * reports for that field. For example:
 * {
 *   total: 5,
 *   counts: {
 *     preserve_layout: 2,
 *     print: 3,
 *   }
 * }
 */
function extractFieldCounts(response, aggregationBucketName) {
  const typeBuckets = _.get(response, `aggregations.${aggregationBucketName}.buckets`, []);
  return {
    total: _.get(response, 'hits.total'),
    counts: typeBuckets.reduce((accum, current) => {
      return {
        ...accum,
        [current.key]: current.doc_count,
      };
    }, {})
  };
}

/*
 * @param {Object} response: Elasticsearch response for an aggregation
 * @param {Array.<string>} aggregationBucketNames: the aggregation buckets to grab data from.
 * @return {Object} An object with count data for each aggregation bucket.  Example:
 * {
 *   layoutTypes: {
 *     total: 5,
 *     counts: {
 *       preserve_layout: 2,
 *       print: 3,
 *     },
 *   },
 *   statusTypes: {
 *     total: 5,
 *     counts: {
 *       completed: 5,
 *     },
 *   }
 * }
 */
function handleResponse(response, aggregationBucketNames) {
  const countsByField = {};
  aggregationBucketNames.forEach(aggregationBucketName => {
    countsByField[aggregationBucketName] = extractFieldCounts(response, aggregationBucketName);
  });
  return countsByField;
}

/*
 * Queries Elasticsearch with a terms aggregation on the Reporting data to get
 * a count of how many reports have been made from each application (Discover, Visualize or Dashboard).
 * @param {Function} callCluster: callWithRequest wrapper
 * @param {Object} config: Kibana server config
 * @param {Array.<{ key: string, name: string, size: Number>} fields.
 * @param {Number} Optional number to restrict results within the given range.
 * @return {Object} see handleResponse
 */
export function getReportCountsByParameter(callCluster, config, fields, withinDayRange) {
  let reportingIndex;
  try {
    // if the reporting plugin is disabled, any `xpack.reporting.*` config is an unknown config key
    reportingIndex = config.get('xpack.reporting.index');
  } catch(err) {
    // Abort from querying if we're unable to determine the correct index to use. Most likely due to reporting
    // being disabled in the config.
    return fields.reduce((acc, field) => {
      acc[field.key] = {
        total: null,
        counts: {}
      };
      return acc;
    }, {});
  }

  const params = {
    index: `${reportingIndex}-*`,
    filterPath: ['hits.total'],
    body: {
      size: 0,
      aggs: {}
    }
  };

  fields.forEach(field=> {
    const fieldName = field.name;
    const key = field.key;

    params.filterPath.push(`aggregations.${key}.buckets`);
    params.body.aggs[key] = {
      terms: {
        field: fieldName,
        size: field.size,
      }
    };
  });

  if (withinDayRange) {
    params.body.query = {
      range: {
        created_at: {
          gte: `now-${withinDayRange}d/d`
        }
      }
    };
  }

  return callCluster('search', params)
    .then(response => handleResponse(response, fields.map(field => field.key)));
}
