/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import moment from 'moment';

import { buildAnomalyTableItems } from './build_anomaly_table_items';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';


// Service for carrying out Elasticsearch queries to obtain data for the
// ML Results dashboards.

const DEFAULT_QUERY_SIZE = 500;
const DEFAULT_MAX_EXAMPLES = 500;

export function resultsServiceProvider(callWithRequest) {

  // Obtains data for the anomalies table, aggregating anomalies by day or hour as requested.
  // Return an Object with properties 'anomalies' and 'interval' (interval used to aggregate anomalies,
  // one of day, hour or second. Note 'auto' can be provided as the aggregationInterval in the request,
  // in which case the interval is determined according to the time span between the first and
  // last anomalies),  plus an examplesByJobId property if any of the
  // anomalies are categorization anomalies in mlcategory.
  async function getAnomaliesTableData(
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords = DEFAULT_QUERY_SIZE,
    maxExamples = DEFAULT_MAX_EXAMPLES) {

    // Build the query to return the matching anomaly record results.
    // Add criteria for the time range, record score, plus any specified job IDs.
    const boolCriteria = [
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis'
          }
        }
      },
      {
        range: {
          record_score: {
            gte: threshold,
          }
        }
      }
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr
        }
      });
    }

    // Add in term queries for each of the specified criteria.
    criteriaFields.forEach((criteria) => {
      boolCriteria.push({
        term: {
          [criteria.fieldName]: criteria.fieldValue
        }
      });
    });

    // Add a nested query to filter for each of the specified influencers.
    if (influencers.length > 0) {
      boolCriteria.push({
        bool: {
          should: influencers.map((influencer) => {
            return {
              nested: {
                path: 'influencers',
                query: {
                  bool: {
                    must: [
                      {
                        match: {
                          'influencers.influencer_field_name': influencer.fieldName
                        }
                      },
                      {
                        match: {
                          'influencers.influencer_field_values': influencer.fieldValue
                        }
                      }
                    ]
                  }
                }
              }
            };
          }),
          minimum_should_match: 1,
        }
      });
    }

    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: maxRecords,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:record',
                  analyze_wildcard: false
                }
              },
              {
                bool: {
                  must: boolCriteria
                }
              }
            ]
          }
        },
        sort: [
          { record_score: { order: 'desc' } }
        ]
      }
    });

    const tableData = { anomalies: [], interval: 'second' };
    if (resp.hits.total !== 0) {
      let records = [];
      resp.hits.hits.forEach((hit) => {
        records.push(hit._source);
      });

      // Sort anomalies in ascending time order.
      records = _.sortBy(records, 'timestamp');
      tableData.interval = aggregationInterval;
      if (aggregationInterval === 'auto') {
        // Determine the actual interval to use if aggregating.
        const earliest = moment(records[0].timestamp);
        const latest = moment(records[records.length - 1].timestamp);

        const daysDiff = latest.diff(earliest, 'days');
        tableData.interval = (daysDiff < 2 ? 'hour' : 'day');
      }

      tableData.anomalies = buildAnomalyTableItems(records, tableData.interval, dateFormatTz);

      // Load examples for any categorization anomalies.
      const categoryAnomalies = tableData.anomalies.filter(item => item.entityName === 'mlcategory');
      if (categoryAnomalies.length > 0) {
        tableData.examplesByJobId = {};

        const categoryIdsByJobId = {};
        categoryAnomalies.forEach((anomaly) => {
          if (!_.has(categoryIdsByJobId, anomaly.jobId)) {
            categoryIdsByJobId[anomaly.jobId] = [];
          }
          if (categoryIdsByJobId[anomaly.jobId].indexOf(anomaly.entityValue) === -1) {
            categoryIdsByJobId[anomaly.jobId].push(anomaly.entityValue);
          }
        });

        const categoryJobIds = Object.keys(categoryIdsByJobId);
        await Promise.all(categoryJobIds.map(async (jobId) => {
          const examplesByCategoryId = await getCategoryExamples(jobId, categoryIdsByJobId[jobId], maxExamples);
          tableData.examplesByJobId[jobId] = examplesByCategoryId;
        }));
      }

    }

    return tableData;

  }


  // Obtains the categorization examples for the categories with the specified IDs
  // from the given index and job ID.
  // Returned response consists of a list of examples against category ID.
  async function getCategoryExamples(jobId, categoryIds, maxExamples) {
    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: DEFAULT_QUERY_SIZE,    // Matches size of records in anomaly summary table.
      body: {
        query: {
          bool: {
            filter: [
              { term: { job_id: jobId } },
              { terms: { category_id: categoryIds } }
            ]
          }
        }
      }
    });

    const examplesByCategoryId = {};
    if (resp.hits.total !== 0) {
      resp.hits.hits.forEach((hit) => {
        if (maxExamples) {
          examplesByCategoryId[hit._source.category_id] =
            _.slice(hit._source.examples, 0, Math.min(hit._source.examples.length, maxExamples));
        } else {
          examplesByCategoryId[hit._source.category_id] = hit._source.examples;
        }
      });
    }

    return examplesByCategoryId;
  }

  // Obtains the definition of the category with the specified ID and job ID.
  // Returned response contains four properties - categoryId, regex, examples
  // and terms (space delimited String of the common tokens matched in values of the category).
  async function getCategoryDefinition(jobId, categoryId) {
    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: 1,
      body: {
        query: {
          bool: {
            filter: [
              { term: { job_id: jobId } },
              { term: { category_id: categoryId } }
            ]
          }
        }
      }
    });

    const definition = { categoryId, terms: null, regex: null, examples: [] };
    if (resp.hits.total !== 0) {
      const source = resp.hits.hits[0]._source;
      definition.categoryId = source.category_id;
      definition.regex = source.regex;
      definition.terms = source.terms;
      definition.examples = source.examples;
    }

    return definition;
  }

  return {
    getAnomaliesTableData,
    getCategoryDefinition,
    getCategoryExamples
  };

}
