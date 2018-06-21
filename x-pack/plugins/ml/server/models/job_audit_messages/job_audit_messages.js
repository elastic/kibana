/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ML_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import moment from 'moment';

export function jobAuditMessagesProvider(callWithRequest) {

  // search for audit messages, jobId is optional.
  // without it, all jobs will be listed.
  // fromRange should be a string formatted in ES time units. e.g. 12h, 1d, 7d
  function getJobAuditMessages(fromRange, jobId) {
    return new Promise((resolve, reject) => {
      let timeFilter = {};
      if (fromRange !== undefined && fromRange !== '') {
        timeFilter = {
          range: {
            timestamp: {
              gte: `now-${fromRange}`,
              lte: 'now'
            }
          }
        };
      }
      const query = {
        bool: {
          filter: [
            {
              bool: {
                must_not: {
                  term: {
                    level: 'activity'
                  }
                }
              }
            },
            timeFilter
          ]
        }
      };

      // if no jobId specified, load all of the messages
      if (jobId !== undefined) {
        query.bool.filter.push({
          bool: {
            should: [
              {
                term: {
                  job_id: '' // catch system messages
                }
              },
              {
                term: {
                  job_id: jobId // messages for specified jobId
                }
              }
            ]
          }
        });
      }

      callWithRequest('search', {
        index: ML_NOTIFICATION_INDEX_PATTERN,
        ignore_unavailable: true,
        size: 1000,
        body:
        {
          sort: [
            { timestamp: { order: 'asc' } },
            { job_id: { order: 'asc' } }
          ],
          query
        }
      })
        .then((resp) => {
          let messages = [];
          if (resp.hits.total !== 0) {
            messages = resp.hits.hits.map(hit => hit._source);
          }
          resolve(messages);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }

  // search highest, most recent audit messages for all jobs for the last 24hrs.
  function getAuditMessagesSummary() {
    return new Promise((resolve, reject) => {
      callWithRequest('search', {
        index: ML_NOTIFICATION_INDEX_PATTERN,
        ignore_unavailable: true,
        size: 0,
        body: {
          query: {
            bool: {
              filter: {
                range: {
                  timestamp: {
                    gte: 'now-1d'
                  }
                }
              }
            }
          },
          aggs: {
            levelsPerJob: {
              terms: {
                field: 'job_id',
              },
              aggs: {
                levels: {
                  terms: {
                    field: 'level',
                  },
                  aggs: {
                    latestMessage: {
                      terms: {
                        field: 'message.raw',
                        size: 1,
                        order: {
                          latestMessage: 'desc'
                        }
                      },
                      aggs: {
                        latestMessage: {
                          max: {
                            field: 'timestamp'
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
          let messagesPerJob = [];
          const LEVEL = { system_info: -1, info: 0, warning: 1, error: 2 };
          const jobMessages = [];
          if (resp.hits.total !== 0 &&
            resp.aggregations &&
            resp.aggregations.levelsPerJob &&
            resp.aggregations.levelsPerJob.buckets &&
            resp.aggregations.levelsPerJob.buckets.length) {
            messagesPerJob = resp.aggregations.levelsPerJob.buckets;
          }

          messagesPerJob.forEach((job) => {
            // ignore system messages (id==='')
            if (job.key !== '' &&
              job.levels && job.levels.buckets && job.levels.buckets.length) {

              let highestLevel = 0;
              let highestLevelText = '';
              let msgTime = 0;

              job.levels.buckets.forEach((level) => {
                const label = level.key;
                // note the highest message level
                if (LEVEL[label] > highestLevel) {
                  highestLevel = LEVEL[label];
                  if (level.latestMessage && level.latestMessage.buckets && level.latestMessage.buckets.length) {
                    level.latestMessage.buckets.forEach((msg) => {
                      // there should only be one result here.
                      highestLevelText = msg.key;

                      // note the time in ms for the highest level
                      // so we can filter them out later if they're earlier than the
                      // job's create time.
                      if (msg.latestMessage && msg.latestMessage.value_as_string) {
                        const time = moment(msg.latestMessage.value_as_string);
                        msgTime = time.valueOf();
                      }

                    });
                  }
                }
              });

              if (msgTime !== 0 && highestLevel !== 0) {
                jobMessages.push({
                  job_id: job.key,
                  highestLevelText,
                  highestLevel,
                  msgTime
                });
              }
            }
          });
          resolve(jobMessages);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }

  return {
    getJobAuditMessages,
    getAuditMessagesSummary
  };
}


