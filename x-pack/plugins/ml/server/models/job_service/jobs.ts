/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import Boom from 'boom';
import { LegacyAPICaller } from 'kibana/server';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import {
  MlSummaryJob,
  AuditMessage,
  Job,
  JobStats,
  DatafeedWithStats,
  CombinedJobWithStats,
} from '../../../common/types/anomaly_detection_jobs';
import { GLOBAL_CALENDAR } from '../../../common/constants/calendars';
import { datafeedsProvider, MlDatafeedsResponse, MlDatafeedsStatsResponse } from './datafeeds';
import { jobAuditMessagesProvider } from '../job_audit_messages';
import { resultsServiceProvider } from '../results_service';
import { CalendarManager, Calendar } from '../calendar';
import { fillResultsWithTimeouts, isRequestTimeout } from './error_utils';
import {
  getLatestDataOrBucketTimestamp,
  isTimeSeriesViewJob,
} from '../../../common/util/job_utils';
import { groupsProvider } from './groups';

export interface MlJobsResponse {
  jobs: Job[];
  count: number;
}

export interface MlJobsStatsResponse {
  jobs: JobStats[];
  count: number;
}

interface Results {
  [id: string]: {
    [status: string]: boolean;
    error?: any;
  };
}

export function jobsProvider(callAsCurrentUser: LegacyAPICaller) {
  const { forceDeleteDatafeed, getDatafeedIdsByJobId } = datafeedsProvider(callAsCurrentUser);
  const { getAuditMessagesSummary } = jobAuditMessagesProvider(callAsCurrentUser);
  const { getLatestBucketTimestampByJob } = resultsServiceProvider(callAsCurrentUser);
  const calMngr = new CalendarManager(callAsCurrentUser);

  async function forceDeleteJob(jobId: string) {
    return callAsCurrentUser('ml.deleteJob', { jobId, force: true });
  }

  async function deleteJobs(jobIds: string[]) {
    const results: Results = {};
    const datafeedIds = await getDatafeedIdsByJobId();

    for (const jobId of jobIds) {
      try {
        const datafeedResp =
          datafeedIds[jobId] === undefined
            ? { acknowledged: true }
            : await forceDeleteDatafeed(datafeedIds[jobId]);

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
          return fillResultsWithTimeouts(
            results,
            datafeedIds[jobId],
            jobIds,
            DATAFEED_STATE.DELETED
          );
        }
        results[jobId] = { deleted: false, error };
      }
    }
    return results;
  }

  async function closeJobs(jobIds: string[]) {
    const results: Results = {};
    for (const jobId of jobIds) {
      try {
        await callAsCurrentUser('ml.closeJob', { jobId });
        results[jobId] = { closed: true };
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(results, jobId, jobIds, JOB_STATE.CLOSED);
        }

        if (
          error.statusCode === 409 &&
          error.response &&
          error.response.includes('datafeed') === false
        ) {
          // the close job request may fail (409) if the job has failed or if the datafeed hasn't been stopped.
          // if the job has failed we want to attempt a force close.
          // however, if we received a 409 due to the datafeed being started we should not attempt a force close.
          try {
            await callAsCurrentUser('ml.closeJob', { jobId, force: true });
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

  async function forceStopAndCloseJob(jobId: string) {
    const datafeedIds = await getDatafeedIdsByJobId();
    const datafeedId = datafeedIds[jobId];
    if (datafeedId === undefined) {
      throw Boom.notFound(`Cannot find datafeed for job ${jobId}`);
    }

    const dfResult = await callAsCurrentUser('ml.stopDatafeed', { datafeedId, force: true });
    if (!dfResult || dfResult.stopped !== true) {
      return { success: false };
    }

    await callAsCurrentUser('ml.closeJob', { jobId, force: true });

    return { success: true };
  }

  async function jobsSummary(jobIds: string[] = []) {
    const fullJobsList: CombinedJobWithStats[] = await createFullJobsList();
    const fullJobsIds = fullJobsList.map((job) => job.job_id);
    const auditMessages: AuditMessage[] = await getAuditMessagesSummary(fullJobsIds);
    const auditMessagesByJob = auditMessages.reduce((acc, cur) => {
      acc[cur.job_id] = cur;
      return acc;
    }, {} as { [id: string]: AuditMessage });

    const deletingStr = i18n.translate('xpack.ml.models.jobService.deletingJob', {
      defaultMessage: 'deleting',
    });

    const jobs = fullJobsList.map((job) => {
      const hasDatafeed =
        typeof job.datafeed_config === 'object' && Object.keys(job.datafeed_config).length > 0;
      const dataCounts = job.data_counts;

      const tempJob: MlSummaryJob = {
        id: job.job_id,
        description: job.description || '',
        groups: Array.isArray(job.groups) ? job.groups.sort() : [],
        processed_record_count: job.data_counts?.processed_record_count,
        memory_status: job.model_size_stats ? job.model_size_stats.memory_status : '',
        jobState: job.deleting === true ? deletingStr : job.state,
        hasDatafeed,
        datafeedId:
          hasDatafeed && job.datafeed_config.datafeed_id ? job.datafeed_config.datafeed_id : '',
        datafeedIndices:
          hasDatafeed && job.datafeed_config.indices ? job.datafeed_config.indices : [],
        datafeedState: hasDatafeed && job.datafeed_config.state ? job.datafeed_config.state : '',
        latestTimestampMs: dataCounts?.latest_record_timestamp,
        earliestTimestampMs: dataCounts?.earliest_record_timestamp,
        latestResultsTimestampMs: getLatestDataOrBucketTimestamp(
          dataCounts?.latest_record_timestamp as number,
          dataCounts?.latest_bucket_timestamp as number
        ),
        isSingleMetricViewerJob: isTimeSeriesViewJob(job),
        nodeName: job.node ? job.node.name : undefined,
        deleting: job.deleting || undefined,
      };
      if (jobIds.find((j) => j === tempJob.id)) {
        tempJob.fullJob = job;
      }
      const auditMessage = auditMessagesByJob[tempJob.id];
      if (
        auditMessage !== undefined &&
        job.create_time !== undefined &&
        job.create_time <= auditMessage.msgTime
      ) {
        tempJob.auditMessage = {
          level: auditMessage.highestLevel,
          text: auditMessage.highestLevelText,
        };
      }
      return tempJob;
    });

    return jobs;
  }

  async function jobsWithTimerange() {
    const fullJobsList = await createFullJobsList();
    const jobsMap: { [id: string]: string[] } = {};

    const jobs = fullJobsList.map((job) => {
      jobsMap[job.job_id] = job.groups || [];
      const hasDatafeed =
        typeof job.datafeed_config === 'object' && Object.keys(job.datafeed_config).length > 0;
      const timeRange: { to?: number; from?: number } = {};

      const dataCounts = job.data_counts;
      if (dataCounts !== undefined) {
        timeRange.to = getLatestDataOrBucketTimestamp(
          dataCounts.latest_record_timestamp as number,
          dataCounts.latest_bucket_timestamp as number
        );
        timeRange.from = dataCounts.earliest_record_timestamp;
      }

      const tempJob = {
        id: job.job_id,
        job_id: job.job_id,
        groups: Array.isArray(job.groups) ? job.groups.sort() : [],
        isRunning: hasDatafeed && job.datafeed_config.state === 'started',
        isSingleMetricViewerJob: isTimeSeriesViewJob(job),
        timeRange,
      };

      return tempJob;
    });

    return { jobs, jobsMap };
  }

  async function createFullJobsList(jobIds: string[] = []) {
    const jobs: CombinedJobWithStats[] = [];
    const groups: { [jobId: string]: string[] } = {};
    const datafeeds: { [id: string]: DatafeedWithStats } = {};
    const calendarsByJobId: { [jobId: string]: string[] } = {};
    const globalCalendars: string[] = [];

    const requests: [
      Promise<MlJobsResponse>,
      Promise<MlJobsStatsResponse>,
      Promise<MlDatafeedsResponse>,
      Promise<MlDatafeedsStatsResponse>,
      Promise<Calendar[]>,
      Promise<{ [id: string]: number | undefined }>
    ] = [
      jobIds.length > 0
        ? callAsCurrentUser<MlJobsResponse>('ml.jobs', { jobId: jobIds }) // move length check in  side call
        : callAsCurrentUser<MlJobsResponse>('ml.jobs'),
      jobIds.length > 0
        ? callAsCurrentUser<MlJobsStatsResponse>('ml.jobStats', { jobId: jobIds })
        : callAsCurrentUser<MlJobsStatsResponse>('ml.jobStats'),
      callAsCurrentUser<MlDatafeedsResponse>('ml.datafeeds'),
      callAsCurrentUser<MlDatafeedsStatsResponse>('ml.datafeedStats'),
      calMngr.getAllCalendars(),
      getLatestBucketTimestampByJob(),
    ];

    const [
      jobResults,
      jobStatsResults,
      datafeedResults,
      datafeedStatsResults,
      calendarResults,
      latestBucketTimestampByJob,
    ] = await Promise.all<
      MlJobsResponse,
      MlJobsStatsResponse,
      MlDatafeedsResponse,
      MlDatafeedsStatsResponse,
      Calendar[],
      { [id: string]: number | undefined }
    >(requests);

    if (datafeedResults && datafeedResults.datafeeds) {
      datafeedResults.datafeeds.forEach((datafeed) => {
        if (datafeedStatsResults && datafeedStatsResults.datafeeds) {
          const datafeedStats = datafeedStatsResults.datafeeds.find(
            (ds) => ds.datafeed_id === datafeed.datafeed_id
          );
          if (datafeedStats) {
            datafeeds[datafeed.job_id] = { ...datafeed, ...datafeedStats };
          }
        }
      });
    }

    // create list of jobs per group.
    // used for assigning calendars to jobs when a calendar has
    // only been attached to a group
    if (jobResults && jobResults.jobs) {
      jobResults.jobs.forEach((job) => {
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
    if (calendarResults) {
      calendarResults.forEach((cal) => {
        cal.job_ids.forEach((id) => {
          if (id === GLOBAL_CALENDAR) {
            globalCalendars.push(cal.calendar_id);
          } else if (groups[id]) {
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
    if (jobResults && jobResults.jobs) {
      jobResults.jobs.forEach((job) => {
        let tempJob = job as CombinedJobWithStats;

        const calendars: string[] = [
          ...(calendarsByJobId[tempJob.job_id] || []),
          ...(globalCalendars || []),
        ];
        if (calendars.length) {
          tempJob.calendars = calendars;
        }

        if (jobStatsResults && jobStatsResults.jobs) {
          const jobStats = jobStatsResults.jobs.find((js) => js.job_id === tempJob.job_id);
          if (jobStats !== undefined) {
            tempJob = { ...tempJob, ...jobStats };
            if (jobStats.node) {
              tempJob.node = jobStats.node;
            }
            if (jobStats.open_time) {
              tempJob.open_time = jobStats.open_time;
            }

            // Add in the timestamp of the last bucket processed for each job if available.
            const latestBucketTimestamp =
              latestBucketTimestampByJob && latestBucketTimestampByJob[tempJob.job_id];
            if (latestBucketTimestamp) {
              tempJob.data_counts.latest_bucket_timestamp = latestBucketTimestamp;
            }
          }
        }

        const datafeed = datafeeds[tempJob.job_id];
        if (datafeed !== undefined) {
          tempJob.datafeed_config = datafeed;
        }

        jobs.push(tempJob);
      });
    }
    return jobs;
  }

  async function deletingJobTasks() {
    const actions = ['cluster:admin/xpack/ml/job/delete'];
    const detailed = true;
    const jobIds = [];
    try {
      const tasksList = await callAsCurrentUser('tasks.list', { actions, detailed });
      Object.keys(tasksList.nodes).forEach((nodeId) => {
        const tasks = tasksList.nodes[nodeId].tasks;
        Object.keys(tasks).forEach((taskId) => {
          jobIds.push(tasks[taskId].description.replace(/^delete-job-/, ''));
        });
      });
    } catch (e) {
      // if the user doesn't have permission to load the task list,
      // use the jobs list to get the ids of deleting jobs
      const { jobs } = await callAsCurrentUser<MlJobsResponse>('ml.jobs');
      jobIds.push(...jobs.filter((j) => j.deleting === true).map((j) => j.job_id));
    }
    return { jobIds };
  }

  // Checks if each of the jobs in the specified list of IDs exist.
  // Job IDs in supplied array may contain wildcard '*' characters
  // e.g. *_low_request_rate_ecs
  async function jobsExist(jobIds: string[] = []) {
    // Get the list of job IDs.
    const jobsInfo = await callAsCurrentUser<MlJobsResponse>('ml.jobs', {
      jobId: jobIds,
    });

    const results: { [id: string]: boolean } = {};
    if (jobsInfo.count > 0) {
      const allJobIds = jobsInfo.jobs.map((job) => job.job_id);

      // Check if each of the supplied IDs match existing jobs.
      jobIds.forEach((jobId) => {
        // Create a Regex for each supplied ID as wildcard * is allowed.
        const regexp = new RegExp(`^${jobId.replace(/\*+/g, '.*')}$`);
        const exists = allJobIds.some((existsJobId) => regexp.test(existsJobId));
        results[jobId] = exists;
      });
    } else {
      jobIds.forEach((jobId) => {
        results[jobId] = false;
      });
    }

    return results;
  }

  async function getAllJobAndGroupIds() {
    const { getAllGroups } = groupsProvider(callAsCurrentUser);
    const jobs = await callAsCurrentUser<MlJobsResponse>('ml.jobs');
    const jobIds = jobs.jobs.map((job) => job.job_id);
    const groups = await getAllGroups();
    const groupIds = groups.map((group) => group.id);

    return {
      jobIds,
      groupIds,
    };
  }

  async function getLookBackProgress(jobId: string, start: number, end: number) {
    const datafeedId = `datafeed-${jobId}`;
    const [jobStats, isRunning] = await Promise.all([
      callAsCurrentUser<MlJobsStatsResponse>('ml.jobStats', { jobId: [jobId] }),
      isDatafeedRunning(datafeedId),
    ]);

    if (jobStats.jobs.length) {
      const statsForJob = jobStats.jobs[0];
      const time = statsForJob.data_counts.latest_record_timestamp;
      const progress = (time - start) / (end - start);
      const isJobClosed = statsForJob.state === JOB_STATE.CLOSED;
      return {
        progress: progress > 0 ? Math.round(progress * 100) : 0,
        isRunning,
        isJobClosed,
      };
    }
    return { progress: 0, isRunning: false, isJobClosed: true };
  }

  async function isDatafeedRunning(datafeedId: string) {
    const stats = await callAsCurrentUser<MlDatafeedsStatsResponse>('ml.datafeedStats', {
      datafeedId: [datafeedId],
    });
    if (stats.datafeeds.length) {
      const state = stats.datafeeds[0].state;
      return (
        state === DATAFEED_STATE.STARTED ||
        state === DATAFEED_STATE.STARTING ||
        state === DATAFEED_STATE.STOPPING
      );
    }
    return false;
  }

  return {
    forceDeleteJob,
    deleteJobs,
    closeJobs,
    forceStopAndCloseJob,
    jobsSummary,
    jobsWithTimerange,
    createFullJobsList,
    deletingJobTasks,
    jobsExist,
    getAllJobAndGroupIds,
    getLookBackProgress,
  };
}
