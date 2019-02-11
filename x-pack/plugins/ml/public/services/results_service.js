/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for carrying out Elasticsearch queries to obtain data for the
// Ml Results dashboards.
import _ from 'lodash';
// import d3 from 'd3';

import { ML_MEDIAN_PERCENTS } from '../../common/util/job_utils';
import { escapeForElasticsearchQuery } from '../util/string_utils';
import { ML_RESULTS_INDEX_PATTERN } from '../../common/constants/index_patterns';

import { ml } from '../services/ml_api_service';

// Obtains the maximum bucket anomaly scores by job ID and time.
// Pass an empty array or ['*'] to search over all job IDs.
// Returned response contains a results property, with a key for job
// which has results for the specified time range.
function getScoresByBucket(jobIds, earliestMs, latestMs, interval, maxResults) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      results: {}
    };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    const boolCriteria = [
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis'
          }
        }
      }
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i) => {
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

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [{
              query_string: {
                query: 'result_type:bucket',
                analyze_wildcard: false
              }
            }, {
              bool: {
                must: boolCriteria
              }
            }]
          }
        },
        aggs: {
          jobId: {
            terms: {
              field: 'job_id',
              size: maxResults !== undefined ? maxResults : 5,
              order: {
                anomalyScore: 'desc'
              }
            },
            aggs: {
              anomalyScore: {
                max: {
                  field: 'anomaly_score'
                }
              },
              byTime: {
                date_histogram: {
                  field: 'timestamp',
                  interval: interval,
                  min_doc_count: 1,
                  extended_bounds: {
                    min: earliestMs,
                    max: latestMs
                  }
                },
                aggs: {
                  anomalyScore: {
                    max: {
                      field: 'anomaly_score'
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const dataByJobId = _.get(resp, ['aggregations', 'jobId', 'buckets'], []);
        _.each(dataByJobId, (dataForJob) => {
          const jobId = dataForJob.key;

          const resultsForTime = {};

          const dataByTime = _.get(dataForJob, ['byTime', 'buckets'], []);
          _.each(dataByTime, (dataForTime) => {
            const value = _.get(dataForTime, ['anomalyScore', 'value']);
            if (value !== undefined) {
              const time = dataForTime.key;
              resultsForTime[time] = _.get(dataForTime, ['anomalyScore', 'value']);
            }
          });
          obj.results[jobId] = resultsForTime;
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Obtains a list of scheduled events by job ID and time.
// Pass an empty array or ['*'] to search over all job IDs.
// Returned response contains a events property, which will only
// contains keys for jobs which have scheduled events for the specified time range.
function getScheduledEventsByBucket(
  jobIds,
  earliestMs,
  latestMs,
  interval,
  maxJobs,
  maxEvents) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      events: {}
    };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
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
        exists: { field: 'scheduled_events' }
      }
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i) => {
        jobIdFilterStr += `${i > 0 ? ' OR ' : ''}job_id:${jobId}`;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr
        }
      });
    }

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [{
              query_string: {
                query: 'result_type:bucket',
                analyze_wildcard: false
              }
            }, {
              bool: {
                must: boolCriteria
              }
            }]
          }
        },
        aggs: {
          jobs: {
            terms: {
              field: 'job_id',
              min_doc_count: 1,
              size: maxJobs
            },
            aggs: {
              times: {
                date_histogram: {
                  field: 'timestamp',
                  interval: interval,
                  min_doc_count: 1
                },
                aggs: {
                  events: {
                    terms: {
                      field: 'scheduled_events',
                      size: maxEvents
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const dataByJobId = _.get(resp, ['aggregations', 'jobs', 'buckets'], []);
        _.each(dataByJobId, (dataForJob) => {
          const jobId = dataForJob.key;
          const resultsForTime = {};
          const dataByTime = _.get(dataForJob, ['times', 'buckets'], []);
          _.each(dataByTime, (dataForTime) => {
            const time = dataForTime.key;
            const events = _.get(dataForTime, ['events', 'buckets']);
            resultsForTime[time] = _.map(events, 'key');
          });
          obj.events[jobId] = resultsForTime;
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}


// Obtains the top influencers, by maximum influencer score, for the specified index, time range and job ID(s).
// Pass an empty array or ['*'] to search over all job IDs.
// An optional array of influencers may be supplied, with each object in the array having 'fieldName'
// and 'fieldValue' properties, to limit data to the supplied list of influencers.
// Returned response contains an influencers property, with a key for each of the influencer field names,
// whose value is an array of objects containing influencerFieldValue, maxAnomalyScore and sumAnomalyScore keys.
function getTopInfluencers(
  jobIds,
  earliestMs,
  latestMs,
  maxFieldValues = 10,
  influencers = []) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, influencers: {} };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
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
          influencer_score: {
            gt: 0
          }
        }
      }
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i) => {
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

    // Add a should query to filter for each of the specified influencers.
    if (influencers.length > 0) {
      boolCriteria.push({
        bool: {
          should: influencers.map((influencer) => {
            return {
              bool: {
                must: [
                  { term: { influencer_field_name: influencer.fieldName } },
                  { term: { influencer_field_value: influencer.fieldValue } }
                ]
              }
            };
          }),
          minimum_should_match: 1,
        }
      });
    }

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:influencer',
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
        aggs: {
          influencerFieldNames: {
            terms: {
              field: 'influencer_field_name',
              size: 5,
              order: {
                maxAnomalyScore: 'desc'
              }
            },
            aggs: {
              maxAnomalyScore: {
                max: {
                  field: 'influencer_score'
                }
              },
              influencerFieldValues: {
                terms: {
                  field: 'influencer_field_value',
                  size: maxFieldValues,
                  order: {
                    maxAnomalyScore: 'desc'
                  }
                },
                aggs: {
                  maxAnomalyScore: {
                    max: {
                      field: 'influencer_score'
                    }
                  },
                  sumAnomalyScore: {
                    sum: {
                      field: 'influencer_score'
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const fieldNameBuckets = _.get(resp, ['aggregations', 'influencerFieldNames', 'buckets'], []);
        _.each(fieldNameBuckets, (nameBucket) => {
          const fieldName = nameBucket.key;
          const fieldValues = [];

          const fieldValueBuckets = _.get(nameBucket, ['influencerFieldValues', 'buckets'], []);
          _.each(fieldValueBuckets, (valueBucket) => {
            const fieldValueResult = {
              influencerFieldValue: valueBucket.key,
              maxAnomalyScore: valueBucket.maxAnomalyScore.value,
              sumAnomalyScore: valueBucket.sumAnomalyScore.value
            };
            fieldValues.push(fieldValueResult);
          });

          obj.influencers[fieldName] = fieldValues;
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Obtains the top influencer field values, by maximum anomaly score, for a
// particular index, field name and job ID(s).
// Pass an empty array or ['*'] to search over all job IDs.
// Returned response contains a results property, which is an array of objects
// containing influencerFieldValue, maxAnomalyScore and sumAnomalyScore keys.
function getTopInfluencerValues(jobIds, influencerFieldName, earliestMs, latestMs, maxResults) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, results: [] };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    const boolCriteria = [{
      range: {
        timestamp: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis'
        }
      }
    }];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i) => {
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

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: `result_type:influencer AND influencer_field_name: ${escapeForElasticsearchQuery(influencerFieldName)}`,
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
        aggs: {
          influencerFieldValues: {
            terms: {
              field: 'influencer_field_value',
              size: maxResults !== undefined ? maxResults : 2,
              order: {
                maxAnomalyScore: 'desc'
              }
            },
            aggs: {
              maxAnomalyScore: {
                max: {
                  field: 'influencer_score'
                }
              },
              sumAnomalyScore: {
                sum: {
                  field: 'influencer_score'
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const buckets = _.get(resp, ['aggregations', 'influencerFieldValues', 'buckets'], []);
        _.each(buckets, (bucket) => {
          const result = {
            influencerFieldValue: bucket.key,
            maxAnomalyScore: bucket.maxAnomalyScore.value,
            sumAnomalyScore: bucket.sumAnomalyScore.value };
          obj.results.push(result);
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Obtains the overall bucket scores for the specified job ID(s).
// Pass ['*'] to search over all job IDs.
// Returned response contains a results property as an object of max score by time.
function getOverallBucketScores(jobIds, topN, earliestMs, latestMs, interval) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, results: {} };

    ml.overallBuckets({
      jobId: jobIds,
      topN: topN,
      bucketSpan: interval,
      start: earliestMs,
      end: latestMs
    })
      .then(resp => {
        const dataByTime = _.get(resp, ['overall_buckets'], []);
        _.each(dataByTime, (dataForTime) => {
          const value = _.get(dataForTime, ['overall_score']);
          if (value !== undefined) {
            obj.results[dataForTime.timestamp] = value;
          }
        });

        resolve(obj);
      })
      .catch(resp => {
        reject(resp);
      });
  });
}

// Obtains the maximum score by influencer_field_value and by time for the specified job ID(s)
// (pass an empty array or ['*'] to search over all job IDs), and specified influencer field
// values (pass an empty array to search over all field values).
// Returned response contains a results property with influencer field values keyed
// against max score by time.
function getInfluencerValueMaxScoreByTime(
  jobIds,
  influencerFieldName,
  influencerFieldValues,
  earliestMs,
  latestMs,
  interval,
  maxResults) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, results: {} };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
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
          influencer_score: {
            gt: 0
          }
        }
      }
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += `job_id:${jobId}`;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr
        }
      });
    }

    if (influencerFieldValues && influencerFieldValues.length > 0) {
      let influencerFilterStr = '';
      _.each(influencerFieldValues, (value, i) => {
        if (i > 0) {
          influencerFilterStr += ' OR ';
        }
        if (value.trim().length > 0) {
          influencerFilterStr += `influencer_field_value:${escapeForElasticsearchQuery(value)}`;
        } else {
          // Wrap whitespace influencer field values in quotes for the query_string query.
          influencerFilterStr += `influencer_field_value:"${value}"`;
        }

      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: influencerFilterStr
        }
      });
    }

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: `result_type:influencer AND influencer_field_name: ${escapeForElasticsearchQuery(influencerFieldName)}`,
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
        aggs: {
          influencerFieldValues: {
            terms: {
              field: 'influencer_field_value',
              size: maxResults !== undefined ? maxResults : 10,
              order: {
                maxAnomalyScore: 'desc'
              }
            },
            aggs: {
              maxAnomalyScore: {
                max: {
                  field: 'influencer_score'
                }
              },
              byTime: {
                date_histogram: {
                  field: 'timestamp',
                  interval,
                  min_doc_count: 1
                },
                aggs: {
                  maxAnomalyScore: {
                    max: {
                      field: 'influencer_score'
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const fieldValueBuckets = _.get(resp, ['aggregations', 'influencerFieldValues', 'buckets'], []);
        _.each(fieldValueBuckets, (valueBucket) => {
          const fieldValue = valueBucket.key;
          const fieldValues = {};

          const timeBuckets = _.get(valueBucket, ['byTime', 'buckets'], []);
          _.each(timeBuckets, (timeBucket) => {
            const time = timeBucket.key;
            const score = timeBucket.maxAnomalyScore.value;
            fieldValues[time] = score;
          });

          obj.results[fieldValue] = fieldValues;
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Queries Elasticsearch to obtain record level results containing the influencers
// for the specified job(s), record score threshold, and time range.
// Pass an empty array or ['*'] to search over all job IDs.
// Returned response contains a records property, with each record containing
// only the fields job_id, detector_index, record_score and influencers.
function getRecordInfluencers(jobIds, threshold, earliestMs, latestMs, maxResults) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, records: [] };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the existence of the nested influencers field, time range,
    // record score, plus any specified job IDs.
    const boolCriteria = [
      {
        nested: {
          path: 'influencers',
          query: {
            bool: {
              must: [
                {
                  exists: { field: 'influencers' }
                }
              ]
            }
          }
        }
      },
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
      _.each(jobIds, (jobId, i) => {
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

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: maxResults !== undefined ? maxResults : 100,
      rest_total_hits_as_int: true,
      body: {
        _source: ['job_id', 'detector_index', 'influencers', 'record_score'],
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
        ],
      }
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          _.each(resp.hits.hits, (hit) => {
            obj.records.push(hit._source);
          });
        }
        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}


// Queries Elasticsearch to obtain the record level results containing the specified influencer(s),
// for the specified job(s), time range, and record score threshold.
// influencers parameter must be an array, with each object in the array having 'fieldName'
// 'fieldValue' properties. The influencer array uses 'should' for the nested bool query,
// so this returns record level results which have at least one of the influencers.
// Pass an empty array or ['*'] to search over all job IDs.
function getRecordsForInfluencer(jobIds, influencers, threshold, earliestMs, latestMs, maxResults) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, records: [] };

    // Build the criteria to use in the bool filter part of the request.
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
      _.each(jobIds, (jobId, i) => {
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

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: maxResults !== undefined ? maxResults : 100,
      rest_total_hits_as_int: true,
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
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          _.each(resp.hits.hits, (hit) => {
            obj.records.push(hit._source);
          });
        }
        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}


// Queries Elasticsearch to obtain the record level results for the specified job and detector,
// time range, record score threshold, and whether to only return results containing influencers.
// An additional, optional influencer field name and value may also be provided.
function getRecordsForDetector(
  jobId,
  detectorIndex,
  checkForInfluencers,
  influencerFieldName,
  influencerFieldValue,
  threshold,
  earliestMs,
  latestMs,
  maxResults) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, records: [] };

    // Build the criteria to use in the bool filter part of the request.
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
        term: { job_id: jobId }
      },
      {
        term: { detector_index: detectorIndex }
      },
      {
        range: {
          record_score: {
            gte: threshold,
          }
        }
      }
    ];

    // Add a nested query to filter for the specified influencer field name and value.
    if (influencerFieldName && influencerFieldValue) {
      boolCriteria.push({
        nested: {
          path: 'influencers',
          query: {
            bool: {
              must: [
                {
                  match: {
                    'influencers.influencer_field_name': influencerFieldName
                  }
                },
                {
                  match: {
                    'influencers.influencer_field_values': influencerFieldValue
                  }
                }
              ]
            }
          }
        }
      });
    } else {
      if (checkForInfluencers === true) {
        boolCriteria.push({
          nested: {
            path: 'influencers',
            query: {
              bool: {
                must: [
                  {
                    exists: { field: 'influencers' }
                  }
                ]
              }
            }
          }
        });
      }
    }

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: maxResults !== undefined ? maxResults : 100,
      rest_total_hits_as_int: true,
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
        ],
      }
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          _.each(resp.hits.hits, (hit) => {
            obj.records.push(hit._source);
          });
        }
        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Queries Elasticsearch to obtain all the record level results for the specified job(s), time range,
// and record score threshold.
// Pass an empty array or ['*'] to search over all job IDs.
// Returned response contains a records property, which is an array of the matching results.
function getRecords(jobIds, threshold, earliestMs, latestMs, maxResults) {
  return this.getRecordsForInfluencer(jobIds, [], threshold, earliestMs, latestMs, maxResults);
}

// Queries Elasticsearch to obtain the record level results matching the given criteria,
// for the specified job(s), time range, and record score threshold.
// criteriaFields parameter must be an array, with each object in the array having 'fieldName'
// 'fieldValue' properties.
// Pass an empty array or ['*'] to search over all job IDs.
function getRecordsForCriteria(jobIds, criteriaFields, threshold, earliestMs, latestMs, maxResults) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, records: [] };

    // Build the criteria to use in the bool filter part of the request.
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
      _.each(jobIds, (jobId, i) => {
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
    _.each(criteriaFields, (criteria) => {
      boolCriteria.push({
        term: {
          [criteria.fieldName]: criteria.fieldValue
        }
      });
    });

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      rest_total_hits_as_int: true,
      size: maxResults !== undefined ? maxResults : 100,
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
        ],
      }
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          _.each(resp.hits.hits, (hit) => {
            obj.records.push(hit._source);
          });
        }
        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}


// Queries Elasticsearch to obtain metric aggregation results.
// index can be a String, or String[], of index names to search.
// entityFields parameter must be an array, with each object in the array having 'fieldName'
//  and 'fieldValue' properties.
// Extra query object can be supplied, or pass null if no additional query
// to that built from the supplied entity fields.
// Returned response contains a results property containing the requested aggregation.
function getMetricData(
  index,
  entityFields,
  query,
  metricFunction,
  metricFieldName,
  timeFieldName,
  earliestMs,
  latestMs,
  interval) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, results: {} };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range, entity fields,
    // plus any additional supplied query.
    const mustCriteria = [];
    const shouldCriteria = [];

    mustCriteria.push({
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis'
        }
      }
    });

    if (query) {
      mustCriteria.push(query);
    }

    _.each(entityFields, (entity) => {
      if (entity.fieldValue.length !== 0) {
        mustCriteria.push({
          term: {
            [entity.fieldName]: entity.fieldValue
          }
        });

      } else {
        // Add special handling for blank entity field values, checking for either
        // an empty string or the field not existing.
        shouldCriteria.push({
          bool: {
            must: [
              {
                term: {
                  [entity.fieldName]: ''
                }
              }
            ]
          }
        });
        shouldCriteria.push({
          bool: {
            must_not: [
              {
                exists: { field: entity.fieldName }
              }
            ]
          }
        });
      }

    });

    const body = {
      query: {
        bool: {
          must: mustCriteria
        }
      },
      size: 0,
      _source: {
        excludes: []
      },
      aggs: {
        byTime: {
          date_histogram: {
            field: timeFieldName,
            interval: interval,
            min_doc_count: 0
          }

        }
      }
    };

    if (shouldCriteria.length > 0) {
      body.query.bool.should = shouldCriteria;
      body.query.bool.minimum_should_match = shouldCriteria.length / 2;
    }

    if (metricFieldName !== undefined && metricFieldName !== '') {
      body.aggs.byTime.aggs = {};

      const metricAgg = {
        [metricFunction]: {
          field: metricFieldName
        }
      };

      if (metricFunction === 'percentiles') {
        metricAgg[metricFunction].percents = [ML_MEDIAN_PERCENTS];
      }
      body.aggs.byTime.aggs.metric = metricAgg;
    }

    ml.esSearch({
      index,
      body
    })
      .then((resp) => {
        const dataByTime = _.get(resp, ['aggregations', 'byTime', 'buckets'], []);
        _.each(dataByTime, (dataForTime) => {
          if (metricFunction === 'count') {
            obj.results[dataForTime.key] = dataForTime.doc_count;
          } else {
            const value = _.get(dataForTime, ['metric', 'value']);
            const values = _.get(dataForTime, ['metric', 'values']);
            if (dataForTime.doc_count === 0) {
              obj.results[dataForTime.key] = null;
            } else if (value !== undefined) {
              obj.results[dataForTime.key] = value;
            } else if (values !== undefined) {
              // Percentiles agg currently returns NaN rather than null when none of the docs in the
              // bucket contain the field used in the aggregation
              // (see elasticsearch issue https://github.com/elastic/elasticsearch/issues/29066).
              // Store as null, so values can be handled in the same manner downstream as other aggs
              // (min, mean, max) which return null.
              const medianValues = values[ML_MEDIAN_PERCENTS];
              obj.results[dataForTime.key] = !isNaN(medianValues) ? medianValues : null;
            } else {
              obj.results[dataForTime.key] = null;
            }
          }
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Queries Elasticsearch to obtain event rate data i.e. the count
// of documents over time.
// index can be a String, or String[], of index names to search.
// Extra query object can be supplied, or pass null if no additional query.
// Returned response contains a results property, which is an object
// of document counts against time (epoch millis).
function getEventRateData(
  index,
  query,
  timeFieldName,
  earliestMs,
  latestMs,
  interval) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, results: {} };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range, entity fields,
    // plus any additional supplied query.
    const mustCriteria = [{
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis'
        }
      }
    }];

    if (query) {
      mustCriteria.push(query);
    }

    ml.esSearch({
      index,
      rest_total_hits_as_int: true,
      size: 0,
      body: {
        query: {
          bool: {
            must: mustCriteria
          }
        },
        _source: {
          excludes: []
        },
        aggs: {
          eventRate: {
            date_histogram: {
              field: timeFieldName,
              interval: interval,
              min_doc_count: 0,
              extended_bounds: {
                min: earliestMs,
                max: latestMs,
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const dataByTimeBucket = _.get(resp, ['aggregations', 'eventRate', 'buckets'], []);
        _.each(dataByTimeBucket, (dataForTime) => {
          const time = dataForTime.key;
          obj.results[time] = dataForTime.doc_count;
        });
        obj.total = resp.hits.total;

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Queries Elasticsearch to obtain event distribution i.e. the count
// of entities over time.
// index can be a String, or String[], of index names to search.
// Extra query object can be supplied, or pass null if no additional query.
// Returned response contains a results property, which is an object
// of document counts against time (epoch millis).
const SAMPLER_TOP_TERMS_SHARD_SIZE = 50000;
const ENTITY_AGGREGATION_SIZE = 10;
const AGGREGATION_MIN_DOC_COUNT = 1;
function getEventDistributionData(
  index,
  splitField,
  filterField = null,
  query,
  metricFunction,
  metricFieldName,
  timeFieldName,
  earliestMs,
  latestMs,
  interval) {
  return new Promise((resolve, reject) => {
    if (splitField === undefined) {
      return resolve([]);
    }

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the time range, entity fields,
    // plus any additional supplied query.
    const mustCriteria = [];

    mustCriteria.push({
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis'
        }
      }
    });

    if (query) {
      mustCriteria.push(query);
    }

    if (filterField !== null) {
      mustCriteria.push({
        term: {
          [filterField.fieldName]: filterField.fieldValue
        }
      });
    }

    const body = {
      query: {
        // using function_score and random_score to get a random sample of documents.
        // otherwise all documents would have the same score and the sampler aggregation
        // would pick the first N documents instead of a random set.
        function_score: {
          query: {
            bool: {
              must: mustCriteria
            }
          },
          functions: [
            {
              random_score: {
                // static seed to get same randomized results on every request
                seed: 10,
                field: '_seq_no'
              }
            }
          ]
        }
      },
      size: 0,
      _source: {
        excludes: []
      },
      aggs: {
        sample: {
          sampler: {
            shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE
          },
          aggs: {
            byTime: {
              date_histogram: {
                field: timeFieldName,
                interval: interval,
                min_doc_count: AGGREGATION_MIN_DOC_COUNT
              },
              aggs: {
                entities: {
                  terms: {
                    field: splitField.fieldName,
                    size: ENTITY_AGGREGATION_SIZE,
                    min_doc_count: AGGREGATION_MIN_DOC_COUNT
                  }
                }
              }
            }
          }
        }
      }
    };

    if (metricFieldName !== undefined && metricFieldName !== '') {
      body.aggs.sample.aggs.byTime.aggs.entities.aggs = {};

      const metricAgg = {
        [metricFunction]: {
          field: metricFieldName
        }
      };

      if (metricFunction === 'percentiles') {
        metricAgg[metricFunction].percents = [ML_MEDIAN_PERCENTS];
      }
      body.aggs.sample.aggs.byTime.aggs.entities.aggs.metric = metricAgg;
    }

    ml.esSearch({
      index,
      body
    })
      .then((resp) => {
        // Because of the sampling, results of metricFunctions which use sum or count
        // can be significantly skewed. Taking into account totalHits we calculate a
        // a factor to normalize results for these metricFunctions.
        const totalHits = _.get(resp, ['hits', 'total'], 0);
        const successfulShards = _.get(resp, ['_shards', 'successful'], 0);

        let normalizeFactor = 1;
        if (totalHits > (successfulShards * SAMPLER_TOP_TERMS_SHARD_SIZE)) {
          normalizeFactor = totalHits / (successfulShards * SAMPLER_TOP_TERMS_SHARD_SIZE);
        }

        const dataByTime = _.get(resp, ['aggregations', 'sample', 'byTime', 'buckets'], []);
        const data = dataByTime.reduce((d, dataForTime) => {
          const date = +dataForTime.key;
          const entities = _.get(dataForTime, ['entities', 'buckets'], []);
          entities.forEach((entity) => {
            let value = (metricFunction === 'count') ? entity.doc_count : entity.metric.value;

            if (
              metricFunction === 'count'
              || metricFunction === 'distinct_count'
              || metricFunction === 'sum'
            ) {
              value = value * normalizeFactor;
            }

            d.push({
              date,
              entity: entity.key,
              value
            });
          });
          return d;
        }, []);
        resolve(data);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

function getModelPlotOutput(
  jobId,
  detectorIndex,
  criteriaFields,
  earliestMs,
  latestMs,
  interval,
  aggType) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      results: {}
    };

    // if an aggType object has been passed in, use it.
    // otherwise default to min and max aggs for the upper and lower bounds
    const modelAggs = (aggType === undefined) ?
      { max: 'max', min: 'min' } :
      {
        max: aggType.max,
        min: aggType.min
      };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the job ID and time range.
    const mustCriteria = [
      {
        term: { job_id: jobId }
      },
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis'
          }
        }
      }
    ];

    // Add in term queries for each of the specified criteria.
    _.each(criteriaFields, (criteria) => {
      mustCriteria.push({
        term: {
          [criteria.fieldName]: criteria.fieldValue
        }
      });
    });

    // Add criteria for the detector index. Results from jobs created before 6.1 will not
    // contain a detector_index field, so use a should criteria with a 'not exists' check.
    const shouldCriteria = [
      {
        term: { detector_index: detectorIndex }
      },
      {
        bool: {
          must_not: [
            {
              exists: { field: 'detector_index' }
            }
          ]
        }
      }
    ];

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [{
              query_string: {
                query: 'result_type:model_plot',
                analyze_wildcard: true
              }
            }, {
              bool: {
                must: mustCriteria,
                should: shouldCriteria,
                minimum_should_match: 1
              }
            }]
          }
        },
        aggs: {
          times: {
            date_histogram: {
              field: 'timestamp',
              interval: interval,
              min_doc_count: 0
            },
            aggs: {
              actual: {
                avg: {
                  field: 'actual'
                }
              },
              modelUpper: {
                [modelAggs.max]: {
                  field: 'model_upper'
                }
              },
              modelLower: {
                [modelAggs.min]: {
                  field: 'model_lower'
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const aggregationsByTime = _.get(resp, ['aggregations', 'times', 'buckets'], []);
        _.each(aggregationsByTime, (dataForTime) => {
          const time = dataForTime.key;
          let modelUpper = _.get(dataForTime, ['modelUpper', 'value']);
          let modelLower = _.get(dataForTime, ['modelLower', 'value']);
          const actual = _.get(dataForTime, ['actual', 'value']);

          if (modelUpper === undefined || isFinite(modelUpper) === false) {
            modelUpper = null;
          }
          if (modelLower === undefined || isFinite(modelLower) === false) {
            modelLower = null;
          }

          obj.results[time] = {
            actual,
            modelUpper,
            modelLower
          };
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Queries Elasticsearch to obtain the max record score over time for the specified job,
// criteria, time range, and aggregation interval.
// criteriaFields parameter must be an array, with each object in the array having 'fieldName'
// 'fieldValue' properties.
function getRecordMaxScoreByTime(jobId, criteriaFields, earliestMs, latestMs, interval) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      results: {}
    };

    // Build the criteria to use in the bool filter part of the request.
    const mustCriteria = [
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis'
          }
        }
      },
      { term: { job_id: jobId } }
    ];
    const shouldCriteria = [];

    _.each(criteriaFields, (criteria) => {
      if (criteria.fieldValue.length !== 0) {
        mustCriteria.push({
          term: {
            [criteria.fieldName]: criteria.fieldValue
          }
        });
      } else {
        // Add special handling for blank entity field values, checking for either
        // an empty string or the field not existing.
        const emptyFieldCondition = {
          bool: {
            must: [
              {
                term: {
                }
              }
            ]
          }
        };
        emptyFieldCondition.bool.must[0].term[criteria.fieldName] = '';
        shouldCriteria.push(emptyFieldCondition);
        shouldCriteria.push({
          bool: {
            must_not: [
              {
                exists: { field: criteria.fieldName }
              }
            ]
          }
        });
      }

    });

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [{
              query_string: {
                query: 'result_type:record',
                analyze_wildcard: true
              }
            }, {
              bool: {
                must: mustCriteria
              }
            }]
          }
        },
        aggs: {
          times: {
            date_histogram: {
              field: 'timestamp',
              interval: interval,
              min_doc_count: 1
            },
            aggs: {
              recordScore: {
                max: {
                  field: 'record_score'
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const aggregationsByTime = _.get(resp, ['aggregations', 'times', 'buckets'], []);
        _.each(aggregationsByTime, (dataForTime) => {
          const time = dataForTime.key;
          obj.results[time] = {
            score: _.get(dataForTime, ['recordScore', 'value']),
          };
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

export const mlResultsService = {
  getScoresByBucket,
  getScheduledEventsByBucket,
  getTopInfluencers,
  getTopInfluencerValues,
  getOverallBucketScores,
  getInfluencerValueMaxScoreByTime,
  getRecordInfluencers,
  getRecordsForInfluencer,
  getRecordsForDetector,
  getRecords,
  getRecordsForCriteria,
  getMetricData,
  getEventRateData,
  getEventDistributionData,
  getModelPlotOutput,
  getRecordMaxScoreByTime
};
