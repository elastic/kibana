/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { i18n } from '@kbn/i18n';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import { datafeedsProvider } from './datafeeds';
import { jobAuditMessagesProvider } from '../job_audit_messages';
import { CalendarManager } from '../calendar';
import { fillResultsWithTimeouts, isRequestTimeout } from './error_utils';
import { isTimeSeriesViewJob } from '../../../common/util/job_utils';
import moment from 'moment';
import { uniq } from 'lodash';

export function jobsProvider(callWithRequest) {

  const { forceDeleteDatafeed, getDatafeedIdsByJobId } = datafeedsProvider(callWithRequest);
  const { getAuditMessagesSummary } = jobAuditMessagesProvider(callWithRequest);
  const calMngr = new CalendarManager(callWithRequest);

  async function forceDeleteJob(jobId) {
    return callWithRequest('ml.deleteJob', { jobId, force: true });
  }

  async function deleteJobs(jobIds) {
    const results = {};
    const datafeedIds = await getDatafeedIdsByJobId();

    for (const jobId of jobIds) {
      try {
        const datafeedResp = (datafeedIds[jobId] === undefined) ?
          { acknowledged: true } :
          await forceDeleteDatafeed(datafeedIds[jobId]);

        if (datafeedResp.acknowledged) {
          try {
            await forceDeleteJob(jobId);
            results[jobId] = { deleted: true };
          } catch (error) {
            if (isRequestTimeout(error)) {
              return fillResultsWithTimeouts(results, jobId, jobIds, DATAFEED_STATE.DELETED);
            }
            results[jobId] = { deleted: false, error };
          }
        }
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(results, datafeedIds[jobId], jobIds, DATAFEED_STATE.DELETED);
        }
        results[jobId] = { deleted: false, error };
      }
    }
    return results;
  }

  async function closeJobs(jobIds) {
    const results = {};
    for (const jobId of jobIds) {
      try {
        await callWithRequest('ml.closeJob', { jobId });
        results[jobId] = { closed: true };
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(results, jobId, jobIds, JOB_STATE.CLOSED);
        }

        if (error.statusCode === 409 && (error.response && error.response.includes('datafeed') === false)) {
          // the close job request may fail (409) if the job has failed or if the datafeed hasn't been stopped.
          // if the job has failed we want to attempt a force close.
          // however, if we received a 409 due to the datafeed being started we should not attempt a force close.
          try {
            await callWithRequest('ml.closeJob', { jobId, force: true });
            results[jobId] = { closed: true };
          } catch (error2) {
            if (isRequestTimeout(error)) {
              return fillResultsWithTimeouts(results, jobId, jobIds, JOB_STATE.CLOSED);
            }
            results[jobId] = { closed: false, error: error2 };
          }
        } else {
          results[jobId] = { closed: false, error };
        }
      }
    }
    return results;
  }

  async function jobsSummary(jobIds = []) {
    const fullJobsList = await createFullJobsList();
    const fullJobsIds = fullJobsList.map(job => job.job_id);
    const auditMessages = await getAuditMessagesSummary(fullJobsIds);
    const auditMessagesByJob = auditMessages.reduce((p, c) => {
      p[c.job_id] = c;
      return p;
    }, {});

    const deletingStr = i18n.translate('xpack.ml.models.jobService.deletingJob', {
      defaultMessage: 'deleting',
    });

    const jobs = fullJobsList.map((job) => {
      const hasDatafeed = (typeof job.datafeed_config === 'object' && Object.keys(job.datafeed_config).length > 0);
      const {
        earliest: earliestTimestampMs,
        latest: latestTimestampMs } = earliestAndLatestTimestamps(job.data_counts);

      const tempJob = {
        id: job.job_id,
        description: (job.description || ''),
        groups: (Array.isArray(job.groups) ? job.groups.sort() : []),
        processed_record_count: job.data_counts.processed_record_count,
        memory_status: (job.model_size_stats) ? job.model_size_stats.memory_status : '',
        jobState: (job.deleting === true) ? deletingStr : job.state,
        hasDatafeed,
        datafeedId: (hasDatafeed && job.datafeed_config.datafeed_id) ? job.datafeed_config.datafeed_id : '',
        datafeedIndices: (hasDatafeed && job.datafeed_config.indices) ? job.datafeed_config.indices : [],
        datafeedState: (hasDatafeed && job.datafeed_config.state) ? job.datafeed_config.state : '',
        latestTimestampMs,
        earliestTimestampMs,
        isSingleMetricViewerJob: isTimeSeriesViewJob(job),
        nodeName: (job.node) ? job.node.name : undefined,
        deleting: (job.deleting || undefined),
      };
      if (jobIds.find(j => (j === tempJob.id))) {
        tempJob.fullJob = job;
      }
      const auditMessage = auditMessagesByJob[tempJob.id];
      if (auditMessage !== undefined && job.create_time <= auditMessage.msgTime) {
        tempJob.auditMessage = {
          level: auditMessage.highestLevel,
          text: auditMessage.highestLevelText
        };
      }
      return tempJob;
    });

    return jobs;
  }

  async function jobsWithTimerange() {
    const fullJobsList = await createFullJobsList();
    const jobsMap = {};

    const jobs = fullJobsList.map((job) => {
      jobsMap[job.job_id] = job.groups || [];
      const hasDatafeed = (typeof job.datafeed_config === 'object' && Object.keys(job.datafeed_config).length > 0);
      const timeRange = {};

      if (job.data_counts !== undefined) {
        timeRange.to = job.data_counts.latest_record_timestamp;
        timeRange.from = job.data_counts.earliest_record_timestamp;
      }

      const tempJob = {
        id: job.job_id,
        job_id: job.job_id,
        groups: (Array.isArray(job.groups) ? job.groups.sort() : []),
        isRunning: (hasDatafeed && job.datafeed_config.state === 'started'),
        isSingleMetricViewerJob: isTimeSeriesViewJob(job),
        timeRange
      };

      return tempJob;
    });

    return { jobs, jobsMap };
  }

  async function createFullJobsList(jobIds = []) {
    const [ JOBS, JOB_STATS, DATAFEEDS, DATAFEED_STATS, CALENDARS ] = [0, 1, 2, 3, 4];

    const jobs = [];
    const groups = {};
    const datafeeds = {};
    const calendarsByJobId = {};
    const requests = (jobIds.length > 0) ? [
      callWithRequest('ml.jobs', { jobId: jobIds }),
      callWithRequest('ml.jobStats', { jobId: jobIds })
    ] : [
      callWithRequest('ml.jobs'),
      callWithRequest('ml.jobStats'),
    ];
    requests.push(
      callWithRequest('ml.datafeeds'),
      callWithRequest('ml.datafeedStats'),
      calMngr.getAllCalendars());

    const results = await Promise.all(requests);

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

  function earliestAndLatestTimestamps(dataCounts) {
    const obj = {
      earliest: undefined,
      latest: undefined,
    };

    if (dataCounts.earliest_record_timestamp) {
      obj.earliest = moment(dataCounts.earliest_record_timestamp).valueOf();
    }

    if (dataCounts.latest_record_timestamp) {
      obj.latest = moment(dataCounts.latest_record_timestamp).valueOf();
    }

    return obj;
  }

  async function deletingJobTasks() {
    const actions = ['cluster:admin/xpack/ml/job/delete'];
    const detailed = true;
    const jobIds = [];
    try {
      const tasksList =  await callWithRequest('tasks.list', { actions, detailed });
      Object.keys(tasksList.nodes).forEach((nodeId) => {
        const tasks = tasksList.nodes[nodeId].tasks;
        Object.keys(tasks).forEach((taskId) => {
          jobIds.push(tasks[taskId].description.replace(/^delete-job-/, ''));
        });
      });
    } catch (e) {
      // if the user doesn't have permission to load the task list,
      // use the jobs list to get the ids of deleting jobs
      const { jobs } = await callWithRequest('ml.jobs');
      jobIds.push(...jobs.filter(j => j.deleting === true).map(j => j.job_id));
    }
    return { jobIds };
  }

  return {
    forceDeleteJob,
    deleteJobs,
    closeJobs,
    jobsSummary,
    jobsWithTimerange,
    createFullJobsList,
    deletingJobTasks,
  };
}
