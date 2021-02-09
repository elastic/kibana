/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import moment from 'moment';

const SIZE = 1000;
const LEVEL = { system_info: -1, info: 0, warning: 1, error: 2 };

// filter to match job_type: 'anomaly_detector' or no job_type field at all
// if no job_type field exist, we can assume the message is for an anomaly detector job
const anomalyDetectorTypeFilter = {
  bool: {
    should: [
      {
        term: {
          job_type: 'anomaly_detector',
        },
      },
      {
        bool: {
          must_not: {
            exists: {
              field: 'job_type',
            },
          },
        },
      },
    ],
    minimum_should_match: 1,
  },
};

export function jobAuditMessagesProvider({ asInternalUser }, mlClient) {
  // search for audit messages,
  // jobId is optional. without it, all jobs will be listed.
  // from is optional and should be a string formatted in ES time units. e.g. 12h, 1d, 7d
  async function getJobAuditMessages(jobSavedObjectService, jobId, from) {
    let gte = null;
    if (jobId !== undefined && from === undefined) {
      const jobs = await mlClient.getJobs({ job_id: jobId });
      if (jobs.count > 0 && jobs.jobs !== undefined) {
        gte = moment(jobs.jobs[0].create_time).valueOf();
      }
    } else if (from !== undefined) {
      gte = `now-${from}`;
    }

    let timeFilter = {};
    if (from !== null) {
      timeFilter = {
        range: {
          timestamp: {
            gte,
            lte: 'now',
          },
        },
      };
    }

    const query = {
      bool: {
        filter: [
          {
            bool: {
              must_not: {
                term: {
                  level: 'activity',
                },
              },
            },
          },
          anomalyDetectorTypeFilter,
          timeFilter,
        ],
      },
    };

    // if no jobId specified, load all of the messages
    if (jobId !== undefined) {
      query.bool.filter.push({
        bool: {
          should: [
            {
              term: {
                job_id: '', // catch system messages
              },
            },
            {
              term: {
                job_id: jobId, // messages for specified jobId
              },
            },
          ],
        },
      });
    }

    const { body } = await asInternalUser.search({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      size: SIZE,
      body: {
        sort: [{ timestamp: { order: 'desc' } }, { job_id: { order: 'asc' } }],
        query,
      },
    });

    let messages = [];
    if (body.hits.total.value > 0) {
      messages = body.hits.hits.map((hit) => hit._source);
    }
    messages = await jobSavedObjectService.filterJobsForSpace(
      'anomaly-detector',
      messages,
      'job_id'
    );
    return messages;
  }

  // search highest, most recent audit messages for all jobs for the last 24hrs.
  async function getAuditMessagesSummary(jobIds) {
    // TODO This is the current default value of the cluster setting `search.max_buckets`.
    // This should possibly consider the real settings in a future update.
    const maxBuckets = 10000;
    let levelsPerJobAggSize = maxBuckets;

    const query = {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: 'now-1d',
              },
            },
          },
          anomalyDetectorTypeFilter,
        ],
      },
    };

    // If the jobIds arg is supplied, add a query filter
    // to only include those jobIds in the aggregations.
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      query.bool.filter.push({
        terms: {
          job_id: jobIds,
        },
      });
      levelsPerJobAggSize = jobIds.length;
    }

    const { body } = await asInternalUser.search({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 0,
      body: {
        query,
        aggs: {
          levelsPerJob: {
            terms: {
              field: 'job_id',
              size: levelsPerJobAggSize,
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
                        latestMessage: 'desc',
                      },
                    },
                    aggs: {
                      latestMessage: {
                        max: {
                          field: 'timestamp',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let messagesPerJob = [];
    const jobMessages = [];
    if (
      body.hits.total.value > 0 &&
      body.aggregations &&
      body.aggregations.levelsPerJob &&
      body.aggregations.levelsPerJob.buckets &&
      body.aggregations.levelsPerJob.buckets.length
    ) {
      messagesPerJob = body.aggregations.levelsPerJob.buckets;
    }

    messagesPerJob.forEach((job) => {
      // ignore system messages (id==='')
      if (job.key !== '' && job.levels && job.levels.buckets && job.levels.buckets.length) {
        let highestLevel = 0;
        let highestLevelText = '';
        let msgTime = 0;

        job.levels.buckets.forEach((level) => {
          const label = level.key;
          // note the highest message level
          if (LEVEL[label] > highestLevel) {
            highestLevel = LEVEL[label];
            if (
              level.latestMessage &&
              level.latestMessage.buckets &&
              level.latestMessage.buckets.length
            ) {
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
            highestLevel: levelToText(highestLevel),
            msgTime,
          });
        }
      }
    });
    return jobMessages;
  }

  function levelToText(level) {
    return Object.keys(LEVEL)[Object.values(LEVEL).indexOf(level)];
  }

  return {
    getJobAuditMessages,
    getAuditMessagesSummary,
  };
}
