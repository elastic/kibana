/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { JOB_STATE, DATAFEED_STATE } from '../../../../../common/constants/states';
import { Group, GroupsDictionary } from './anomaly_detection_panel';
import { MlSummaryJobs, MlSummaryJob } from '../../../../../common/types/anomaly_detection_jobs';

export function getGroupsFromJobs(
  jobs: MlSummaryJobs
): { groups: GroupsDictionary; count: number } {
  const groups: any = {
    ungrouped: {
      id: 'ungrouped',
      jobIds: [],
      docs_processed: 0,
      latest_timestamp: 0,
      max_anomaly_score: null,
      jobs_in_group: 0,
    },
  };

  jobs.forEach((job: MlSummaryJob) => {
    // Organize job by group
    if (job.groups.length > 0) {
      job.groups.forEach((g: any) => {
        if (groups[g] === undefined) {
          groups[g] = {
            id: g,
            jobIds: [job.id],
            docs_processed: job.processed_record_count,
            latest_timestamp: job.latestTimestampMs,
            max_anomaly_score: null,
            jobs_in_group: 1,
          };
        } else {
          groups[g].jobIds.push(job.id);
          groups[g].docs_processed += job.processed_record_count;
          groups[g].jobs_in_group++;
          // if incoming job latest timestamp is greater than the last saved one, replace it
          if (groups[g].latest_timestamp === undefined) {
            groups[g].latest_timestamp = job.latestTimestampMs;
          } else if (job.latestTimestampMs && job.latestTimestampMs > groups[g].latest_timestamp) {
            groups[g].latest_timestamp = job.latestTimestampMs;
          }
        }
      });
    } else {
      groups.ungrouped.jobIds.push(job.id);
      groups.ungrouped.docs_processed += job.processed_record_count;
      groups.ungrouped.jobs_in_group++;
      // if incoming job latest timestamp is greater than the last saved one, replace it
      if (job.latestTimestampMs && job.latestTimestampMs > groups.ungrouped.latest_timestamp) {
        groups.ungrouped.latest_timestamp = job.latestTimestampMs;
      }
    }
  });

  if (groups.ungrouped.jobIds.length === 0) {
    delete groups.ungrouped;
  }

  const count = Object.values(groups).length;

  return { groups, count };
}

export function getStatsBarData(jobsList: any) {
  const jobStats = {
    activeNodes: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.activeMLNodesLabel', {
        defaultMessage: 'Active ML nodes',
      }),
      value: 0,
      show: true,
    },
    total: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.totalJobsLabel', {
        defaultMessage: 'Total jobs',
      }),
      value: 0,
      show: true,
    },
    open: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.openJobsLabel', {
        defaultMessage: 'Open jobs',
      }),
      value: 0,
      show: true,
    },
    closed: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.closedJobsLabel', {
        defaultMessage: 'Closed jobs',
      }),
      value: 0,
      show: true,
    },
    failed: {
      label: i18n.translate('xpack.ml.overviewJobsList.statsBar.failedJobsLabel', {
        defaultMessage: 'Failed jobs',
      }),
      value: 0,
      show: false,
    },
    activeDatafeeds: {
      label: i18n.translate('xpack.ml.jobsList.statsBar.activeDatafeedsLabel', {
        defaultMessage: 'Active datafeeds',
      }),
      value: 0,
      show: true,
    },
  };

  if (jobsList === undefined) {
    return jobStats;
  }

  // object to keep track of nodes being used by jobs
  const mlNodes: any = {};
  let failedJobs = 0;

  jobsList.forEach((job: MlSummaryJob) => {
    if (job.jobState === JOB_STATE.OPENED) {
      jobStats.open.value++;
    } else if (job.jobState === JOB_STATE.CLOSED) {
      jobStats.closed.value++;
    } else if (job.jobState === JOB_STATE.FAILED) {
      failedJobs++;
    }

    if (job.hasDatafeed && job.datafeedState === DATAFEED_STATE.STARTED) {
      jobStats.activeDatafeeds.value++;
    }

    if (job.nodeName !== undefined) {
      mlNodes[job.nodeName] = {};
    }
  });

  jobStats.total.value = jobsList.length;

  // Only show failed jobs if it is non-zero
  if (failedJobs) {
    jobStats.failed.value = failedJobs;
    jobStats.failed.show = true;
  } else {
    jobStats.failed.show = false;
  }

  jobStats.activeNodes.value = Object.keys(mlNodes).length;

  return jobStats;
}

export function getJobsFromGroup(group: Group, jobs: any) {
  return group.jobIds.map((jobId) => jobs[jobId]).filter((id) => id !== undefined);
}

export function getJobsWithTimerange(jobsList: any) {
  const jobs: any = {};
  jobsList.forEach((job: any) => {
    if (jobs[job.id] === undefined) {
      // create the job in the object with the times you need
      if (job.earliestTimestampMs !== undefined) {
        const { earliestTimestampMs, latestResultsTimestampMs } = job;
        jobs[job.id] = {
          id: job.id,
          earliestTimestampMs,
          latestResultsTimestampMs,
        };
      }
    }
  });

  return jobs;
}
