/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for carrying out Elasticsearch queries to obtain data for the
// Ml Results dashboards.
import _ from 'lodash';

import {
  ML_ANNOTATIONS_INDEX_PATTERN,
} from '../../common/constants/index_patterns';

import { ml } from '../services/ml_api_service';

import { isAnnotations } from '../../common/interfaces/annotations.ts';

// Obtains a list of annotations by job ID and time.
// Pass an empty array or ['*'] to search over all job IDs.
function getAnnotations(
  jobIds,
  earliestMs,
  latestMs,
  maxAnnotations) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      annotations: {}
    };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    // The nested must_not time range filter queries make sure that we fetch:
    // - annotations with start and end within the time range
    // - annotations that either start or end within the time range
    // - annotations that start before and end after the given time range
    // - but skip annotation that are completely outside the time range
    //   (the ones that start and end before or after the time range)
    const boolCriteria = [
      {
        bool: {
          must_not: [
            {
              bool: {
                filter: [
                  {
                    range: {
                      timestamp: {
                        lte: earliestMs,
                        format: 'epoch_millis'
                      }
                    }
                  },
                  {
                    range: {
                      end_timestamp: {
                        lte: earliestMs,
                        format: 'epoch_millis'
                      }
                    }
                  }
                ]
              }
            },
            {
              bool: {
                filter: [
                  {
                    range: {
                      timestamp: {
                        gte: latestMs,
                        format: 'epoch_millis'
                      }
                    }
                  },
                  {
                    range: {
                      end_timestamp: {
                        gte: latestMs,
                        format: 'epoch_millis'
                      }
                    }
                  }
                ]
              }
            },
          ]
        }
      },
      {
        exists: { field: 'annotation' }
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
      index: ML_ANNOTATIONS_INDEX_PATTERN,
      size: maxAnnotations,
      body: {
        query: {
          bool: {
            filter: [{
              query_string: {
                query: 'result_type:annotation',
                analyze_wildcard: false
              }
            }, {
              bool: {
                must: boolCriteria
              }
            }]
          }
        }
      }
    })
      .then((resp) => {
        const docs = _.get(resp, ['hits', 'hits']).map(d => {
          // get the original source document and the document id, we need it
          // to identify the annotation when editing/deleting it.
          return { ...d._source, _id: d._id };
        });

        if (isAnnotations(docs) === false) {
          reject(`Annotations didn't pass TypeScript interface check.`);
        }

        docs.forEach((doc) => {
          const jobId = doc.job_id;
          if (typeof obj.annotations[jobId] === 'undefined') {
            obj.annotations[jobId] = [];
          }
          obj.annotations[jobId].push(doc);
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

export const mlAnnotationsService = {
  getAnnotations
};
