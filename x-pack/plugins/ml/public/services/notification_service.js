/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for carrying out Elasticsearch queries to obtain data for the
// Ml Results dashboards.
import _ from 'lodash';

import { ML_NOTIFICATION_INDEX_PATTERN } from 'plugins/ml/constants/index_patterns';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlNotificationService', function ($q, es) {

  // search for audit messages, jobId is optional.
  // without it, all jobs will be listed.
  // fromRange should be a string formatted in ES time units. e.g. 12h, 1d, 7d
  this.getJobAuditMessages = function (fromRange, jobId) {
    const deferred = $q.defer();
    const messages = [];

    let jobFilter = {};
    // if no jobId specified, load all of the messages
    if (jobId !== undefined) {
      jobFilter = {
        'bool': {
          'should': [
            {
              'term': {
                'job_id': '' // catch system messages
              }
            },
            {
              'term': {
                'job_id': jobId // messages for specified jobId
              }
            }
          ]
        }
      };
    }

    let timeFilter = {};
    if (fromRange !== undefined && fromRange !== '') {
      timeFilter = {
        'range': {
          'timestamp': {
            'gte': 'now-' + fromRange,
            'lte': 'now'
          }
        }
      };
    }

    es.search({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 1000,
      body:
      {
        sort: [
          { 'timestamp': { 'order': 'asc' } },
          { 'job_id': { 'order': 'asc' } }
        ],
        'query': {
          'bool': {
            'filter': [
              {
                'bool': {
                  'must_not': {
                    'term': {
                      'level': 'activity'
                    }
                  }
                }
              },
              jobFilter,
              timeFilter
            ]
          }
        }
      }
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          _.each(resp.hits.hits, (hit) => {
            messages.push(hit._source);
          });
        }
        deferred.resolve({ messages });
      })
      .catch((resp) => {
        deferred.reject(resp);
      });
    return deferred.promise;
  };

  // search highest, most recent audit messages for all jobs for the last 24hrs.
  this.getAuditMessagesSummary = function () {
    const deferred = $q.defer();
    const aggs = [];

    es.search({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 0,
      body: {
        'query': {
          'bool': {
            'filter': {
              'range': {
                'timestamp': {
                  'gte': 'now-1d'
                }
              }
            }
          }
        },
        'aggs': {
          'levelsPerJob': {
            'terms': {
              'field': 'job_id',
            },
            'aggs': {
              'levels': {
                'terms': {
                  'field': 'level',
                },
                'aggs': {
                  'latestMessage': {
                    'terms': {
                      'field': 'message.raw',
                      'size': 1,
                      'order': {
                        'latestMessage': 'desc'
                      }
                    },
                    'aggs': {
                      'latestMessage': {
                        'max': {
                          'field': 'timestamp'
                        }
                      }
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
        if (resp.hits.total !== 0 &&
        resp.aggregations &&
        resp.aggregations.levelsPerJob &&
        resp.aggregations.levelsPerJob.buckets &&
        resp.aggregations.levelsPerJob.buckets.length) {
          _.each(resp.aggregations.levelsPerJob.buckets, (agg) => {
            aggs.push(agg);
          });
        }
        deferred.resolve({ messagesPerJob: aggs });
      })
      .catch((resp) => {
        deferred.reject(resp);
      });
    return deferred.promise;
  };

});
