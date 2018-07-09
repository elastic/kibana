/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datafeedsProvider } from './datafeeds';
import { jobAuditMessagesProvider } from '../job_audit_messages';
import { CalendarManager } from '../calendar';
import moment from 'moment';
import { uniq } from 'lodash';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export function jobsProvider(callWithRequest) {

  const { forceDeleteDatafeed } = datafeedsProvider(callWithRequest);
  const { getAuditMessagesSummary } = jobAuditMessagesProvider(callWithRequest);
  const calMngr = new CalendarManager(callWithRequest);

  async function forceDeleteJob(jobId) {
    return callWithRequest('ml.deleteJob', { jobId, force: true });
  }

  async function deleteJobs(jobIds) {
    const results = {};
    const datafeedIds = jobIds.reduce((p, c) => {
      p[c] = `datafeed-${c}`;
      return p;
    }, {});

    for (const jobId of jobIds) {
      try {
        const datafeedResp = await forceDeleteDatafeed(datafeedIds[jobId]);
        if (datafeedResp.acknowledged) {
          try {
            await forceDeleteJob(jobId);
            results[jobId] = { deleted: true };
          } catch (error) {
            results[jobId] = { deleted: false, error };
          }
        }
      } catch (error) {
        results[jobId] = { deleted: false, error };
      }
    }
    return results;
  }

  async function jobsSummary(jobIds = []) {
    const fullJobsList = await createFullJobsList();
    const auditMessages = await getAuditMessagesSummary();
    const auditMessagesByJob = auditMessages.reduce((p, c) => {
      p[c.job_id] = c;
      return p;
    }, {});

    const jobs = fullJobsList.map((job) => {
      const hasDatafeed = (job.datafeed_config !== undefined);
      const {
        earliest: earliestTimeStamp,
        latest: latestTimeStamp } = earliestAndLatestTimeStamps(job.data_counts);

      const tempJob = {
        id: job.job_id,
        description: (job.description || ''),
        groups: (job.groups || []),
        processed_record_count: job.data_counts.processed_record_count,
        memory_status: (job.model_size_stats) ? job.model_size_stats.memory_status : '',
        jobState: job.state,
        hasDatafeed,
        datafeedId: (hasDatafeed && job.datafeed_config.datafeed_id) ? job.datafeed_config.datafeed_id : '',
        datafeedState: (hasDatafeed && job.datafeed_config.state) ? job.datafeed_config.state : '',
        latestTimeStamp,
        earliestTimeStamp,
        nodeName: (job.node) ? job.node.name : undefined,
      };
      if (jobIds.find(j => (j === tempJob.id))) {
        tempJob.fullJob = job;
      }
      const auditMessage = auditMessagesByJob[tempJob.id];
      if (auditMessage !== undefined) {
        tempJob.auditMessage = {
          level: auditMessage.highestLevel,
          text: auditMessage.highestLevelText
        };
      }
      return tempJob;
    });

    return jobs;
  }

  async function createFullJobsList(jobIds = []) {
    const [ JOBS, JOB_STATS, DATAFEEDS, DATAFEED_STATS, CALENDARS ] = [0, 1, 2, 3, 4];

    const jobs = [];
    const groups = {};
    const datafeeds = {};
    const calendarsByJobId = {};
    const results = await Promise.all([
      callWithRequest('ml.jobs', { jobId: jobIds }),
      callWithRequest('ml.jobStats', { jobId: jobIds }),
      callWithRequest('ml.datafeeds'),
      callWithRequest('ml.datafeedStats'),
      calMngr.getAllCalendars(),
    ]);

    if (results[DATAFEEDS] && results[DATAFEEDS].datafeeds) {
      results[DATAFEEDS].datafeeds.forEach((datafeed) => {
        if (results[DATAFEED_STATS] && results[DATAFEED_STATS].datafeeds) {
          const datafeedStats = results[DATAFEED_STATS].datafeeds.find(ds => (ds.datafeed_id === datafeed.datafeed_id));
          if (datafeedStats) {
            datafeed.state = datafeedStats.state;
          }
        }
        datafeeds[datafeed.job_id] = datafeed;
      });
    }

    // create list of jobs per group.
    // used for assigning calendars to jobs when a calendar has
    // only been attached to a group
    if (results[JOBS] && results[JOBS].jobs) {
      results[JOBS].jobs.forEach((job) => {
        calendarsByJobId[job.job_id] = [];

        if (job.groups !== undefined) {
          job.groups.forEach((gId) => {
            if (groups[gId] === undefined) {
              groups[gId] = [];
            }
            groups[gId].push(job.job_id);
          });
        }
      });
    }

    // assign calendars to jobs
    if (results[CALENDARS]) {
      results[CALENDARS].forEach((cal) => {
        cal.job_ids.forEach((id) => {
          if (groups[id]) {
            groups[id].forEach((jId) => {
              if (calendarsByJobId[jId] !== undefined) {
                calendarsByJobId[jId].push(cal.calendar_id);
              }
            });
          } else {
            if (calendarsByJobId[id] !== undefined) {
              calendarsByJobId[id].push(cal.calendar_id);
            }
          }
        });
      });

      // de-duplicate calendars
      for (const cal in calendarsByJobId) {
        if (calendarsByJobId.hasOwnProperty(cal)) {
          calendarsByJobId[cal] = uniq(calendarsByJobId[cal]);
        }
      }
    }


    // create jobs objects containing job stats, datafeeds, datafeed stats and calendars
    if (results[JOBS] && results[JOBS].jobs) {
      results[JOBS].jobs.forEach((job) => {
        job.data_counts = {};
        job.model_size_stats = {};
        job.datafeed_config = {};

        if (calendarsByJobId[job.job_id].length) {
          job.calendars = calendarsByJobId[job.job_id];
        }

        if (results[JOB_STATS] && results[JOB_STATS].jobs) {
          const jobStats = results[JOB_STATS].jobs.find(js => (js.job_id === job.job_id));
          if (jobStats !== undefined) {
            job.state = jobStats.state;
            job.data_counts = jobStats.data_counts;
            job.model_size_stats = jobStats.model_size_stats;
            if (jobStats.node) {
              job.node = jobStats.node;
            }
            if (jobStats.open_time) {
              job.open_time = jobStats.open_time;
            }
          }
        }

        const datafeed = datafeeds[job.job_id];
        if (datafeed !== undefined) {
          job.datafeed_config = datafeed;
        }

        jobs.push(job);
      });
    }
    return jobs;
  }

  function earliestAndLatestTimeStamps(dataCounts) {
    const obj = {
      earliest: { string: '', unix: 0 },
      latest: { string: '', unix: 0 },
    };

    if (dataCounts.earliest_record_timestamp) {
      const ts = moment(dataCounts.earliest_record_timestamp);
      obj.earliest.string = ts.format(TIME_FORMAT);
      obj.earliest.unix = ts.valueOf();
      obj.earliest.moment = ts;
    }

    if (dataCounts.latest_record_timestamp) {
      const ts = moment(dataCounts.latest_record_timestamp);
      obj.latest.string = ts.format(TIME_FORMAT);
      obj.latest.unix = ts.valueOf();
      obj.latest.moment = ts;
    }

    return obj;
  }

  async function getAllGroups() {
    const groups = {};
    const jobIds = {};
    const [ JOBS, CALENDARS ] = [0, 1];
    const results = await Promise.all([
      callWithRequest('ml.jobs'),
      calMngr.getAllCalendars(),
    ]);

    if (results[JOBS] && results[JOBS].jobs) {
      results[JOBS].jobs.forEach((job) => {
        jobIds[job.job_id] = null;
        if (job.groups !== undefined) {
          job.groups.forEach((g) => {
            if (groups[g] === undefined) {
              groups[g] = {
                id: g,
                jobIds: [job.job_id],
                calendarIds: []
              };
            } else {
              groups[g].jobIds.push(job.job_id);
            }

          });

        }
      });
    }
    if (results[CALENDARS]) {
      results[CALENDARS].forEach((cal) => {
        cal.job_ids.forEach((jId) => {
          if (jobIds[jId] === undefined) {
            if (groups[jId] === undefined) {
              groups[jId] = {
                id: jId,
                jobIds: [],
                calendarIds: [cal.calendar_id]
              };
            } else {
              groups[jId].calendarIds.push(cal.calendar_id);
            }
          }
        });
      });
    }

    return Object.keys(groups).map(g => groups[g]);
  }

  return {
    forceDeleteJob,
    deleteJobs,
    jobsSummary,
    createFullJobsList,
    getAllGroups,
  };
}
