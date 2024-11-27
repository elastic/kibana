/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';

import { i18n } from '@kbn/i18n';
import { parseInterval } from '@kbn/ml-parse-interval';

import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';
import { stringMatch } from '../../../util/string_utils';
import { JOB_STATE, DATAFEED_STATE } from '../../../../../common/constants/states';
import { JOB_ACTION } from '../../../../../common/constants/job_actions';
import { mlCalendarService } from '../../../services/calendar_service';
import { jobCloningService } from '../../../services/job_cloning_service';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { PLUGIN_ID } from '../../../../../common/constants/app';
import { CREATED_BY_LABEL } from '../../../../../common/constants/new_job';

export function loadFullJob(mlApi, jobId) {
  return new Promise((resolve, reject) => {
    mlApi.jobs
      .jobs([jobId])
      .then((jobs) => {
        if (jobs.length) {
          resolve(jobs[0]);
        } else {
          throw new Error(`Could not find job ${jobId}`);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export function loadJobForCloning(mlApi, jobId) {
  return new Promise((resolve, reject) => {
    mlApi.jobs
      .jobForCloning(jobId)
      .then((resp) => {
        if (resp) {
          resolve(resp);
        } else {
          throw new Error(`Could not find job ${jobId}`);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export function isStartable(jobs) {
  return jobs.some(
    (j) => j.datafeedState === DATAFEED_STATE.STOPPED && j.jobState !== JOB_STATE.CLOSING
  );
}

export function isStoppable(jobs) {
  return jobs.some(
    (j) => j.datafeedState === DATAFEED_STATE.STARTED || j.datafeedState === DATAFEED_STATE.STARTING
  );
}

export function isClosable(jobs) {
  return jobs.some(
    (j) =>
      j.datafeedState === DATAFEED_STATE.STOPPED &&
      j.jobState !== JOB_STATE.CLOSED &&
      j.jobState !== JOB_STATE.CLOSING
  );
}

export function isResettable(jobs) {
  return jobs.some(
    (j) => j.jobState === JOB_STATE.CLOSED || j.blocked?.reason === JOB_ACTION.RESET
  );
}

export function forceStartDatafeeds(
  toastNotifications,
  mlApi,
  jobs,
  start,
  end,
  finish = () => {}
) {
  const datafeedIds = jobs.filter((j) => j.hasDatafeed).map((j) => j.datafeedId);
  mlApi.jobs
    .forceStartDatafeeds(datafeedIds, start, end)
    .then((resp) => {
      showResults(toastNotifications, resp, DATAFEED_STATE.STARTED);
      finish();
    })
    .catch((error) => {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.jobsList.startJobErrorMessage', {
          defaultMessage: 'Jobs failed to start',
        }),
        error
      );
      finish();
    });
}

export function stopDatafeeds(toastNotifications, mlApi, jobs, finish = () => {}) {
  const datafeedIds = jobs.filter((j) => j.hasDatafeed).map((j) => j.datafeedId);
  mlApi.jobs
    .stopDatafeeds(datafeedIds)
    .then((resp) => {
      showResults(toastNotifications, resp, DATAFEED_STATE.STOPPED);
      finish();
    })
    .catch((error) => {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.jobsList.stopJobErrorMessage', {
          defaultMessage: 'Jobs failed to stop',
        }),
        error
      );
      finish();
    });
}

function showResults(toastNotifications, resp, action) {
  const successes = [];
  const failures = [];
  for (const d in resp) {
    if (
      resp[d][action] === true ||
      (resp[d][action] === false &&
        resp[d].error.statusCode === 409 &&
        action === DATAFEED_STATE.STARTED)
    ) {
      successes.push(d);
    } else {
      failures.push({
        id: d,
        result: resp[d],
      });
    }
  }

  let actionText = '';
  let actionTextPT = '';
  if (action === DATAFEED_STATE.STARTED) {
    actionText = i18n.translate('xpack.ml.jobsList.startActionStatusText', {
      defaultMessage: 'start',
    });
    actionTextPT = i18n.translate('xpack.ml.jobsList.startedActionStatusText', {
      defaultMessage: 'started',
    });
  } else if (action === DATAFEED_STATE.STOPPED) {
    actionText = i18n.translate('xpack.ml.jobsList.stopActionStatusText', {
      defaultMessage: 'stop',
    });
    actionTextPT = i18n.translate('xpack.ml.jobsList.stoppedActionStatusText', {
      defaultMessage: 'stopped',
    });
  } else if (action === DATAFEED_STATE.DELETED) {
    actionText = i18n.translate('xpack.ml.jobsList.deleteActionStatusText', {
      defaultMessage: 'delete',
    });
    actionTextPT = i18n.translate('xpack.ml.jobsList.deletedActionStatusText', {
      defaultMessage: 'deleted',
    });
  } else if (action === JOB_STATE.CLOSED) {
    actionText = i18n.translate('xpack.ml.jobsList.closeActionStatusText', {
      defaultMessage: 'close',
    });
    actionTextPT = i18n.translate('xpack.ml.jobsList.closedActionStatusText', {
      defaultMessage: 'closed',
    });
  } else if (action === JOB_ACTION.RESET) {
    actionText = i18n.translate('xpack.ml.jobsList.resetActionStatusText', {
      defaultMessage: 'reset',
    });
    actionTextPT = i18n.translate('xpack.ml.jobsList.resetActionStatusText', {
      defaultMessage: 'reset',
    });
  }

  if (successes.length > 0) {
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.jobsList.actionExecuteSuccessfullyNotificationMessage', {
        defaultMessage:
          '{successesJobsCount, plural, one{{successJob}} other{# jobs}} {actionTextPT} successfully',
        values: {
          successesJobsCount: successes.length,
          successJob: successes[0],
          actionTextPT,
        },
      })
    );
  }

  if (failures.length > 0) {
    failures.forEach((f) => {
      const toastNotificationService = toastNotificationServiceProvider(toastNotifications);
      toastNotificationService.displayErrorToast(
        f.result.error,
        i18n.translate('xpack.ml.jobsList.actionFailedNotificationMessage', {
          defaultMessage: '{failureId} failed to {actionText}',
          values: {
            failureId: f.id,
            actionText,
          },
        })
      );
    });
  }
}

export async function cloneJob(toastNotifications, application, mlApi, jobId) {
  try {
    const [{ job: cloneableJob, datafeed }, originalJob] = await Promise.all([
      loadJobForCloning(mlApi, jobId),
      loadFullJob(mlApi, jobId),
    ]);

    const tempJobCloningData = {
      skipTimeRangeStep: false,
    };

    const createdBy = originalJob?.custom_settings?.created_by;
    if (
      cloneableJob !== undefined &&
      createdBy !== undefined &&
      createdBy !== CREATED_BY_LABEL.ADVANCED
    ) {
      // if the job is from a wizards, i.e. contains a created_by property
      // use tempJobCloningData to temporarily store the job
      tempJobCloningData.createdBy = originalJob?.custom_settings?.created_by;
      tempJobCloningData.job = cloneableJob;

      if (
        originalJob.data_counts.earliest_record_timestamp !== undefined &&
        originalJob.data_counts.latest_record_timestamp !== undefined &&
        originalJob.data_counts.latest_bucket_timestamp !== undefined
      ) {
        // if the job has run before, use the earliest and latest record timestamp
        // as the cloned job's time range
        let start = originalJob.data_counts.earliest_record_timestamp;
        let end = originalJob.data_counts.latest_record_timestamp;

        if (originalJob.datafeed_config.aggregations !== undefined) {
          // if the datafeed uses aggregations the earliest and latest record timestamps may not be the same
          // as the start and end of the data in the index.
          const bucketSpanMs = parseInterval(
            originalJob.analysis_config.bucket_span
          ).asMilliseconds();
          // round down to the start of the nearest bucket
          start =
            Math.floor(originalJob.data_counts.earliest_record_timestamp / bucketSpanMs) *
            bucketSpanMs;
          // use latest_bucket_timestamp and add two bucket spans minus one ms
          end = originalJob.data_counts.latest_bucket_timestamp + bucketSpanMs * 2 - 1;
        }

        tempJobCloningData.start = start;
        tempJobCloningData.end = end;
      }
    } else {
      // otherwise tempJobCloningData
      tempJobCloningData.job = cloneableJob;
      // resets the createdBy field in case it still retains previous settings
      tempJobCloningData.createdBy = undefined;
    }
    if (datafeed !== undefined) {
      tempJobCloningData.datafeed = datafeed;
    }

    if (originalJob.calendars) {
      tempJobCloningData.calendars = await mlCalendarService.fetchCalendarsByIds(
        mlApi,
        originalJob.calendars
      );
    }

    jobCloningService.stashJobCloningData(tempJobCloningData);

    application.navigateToApp(PLUGIN_ID, { path: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB });
  } catch (error) {
    toastNotificationServiceProvider(toastNotifications).displayErrorToast(
      error,
      i18n.translate('xpack.ml.jobsList.cloneJobErrorMessage', {
        defaultMessage: 'Could not clone {jobId}. Job could not be found',
        values: { jobId },
      })
    );
  }
}

export function closeJobs(toastNotifications, mlApi, jobs, finish = () => {}) {
  const jobIds = jobs.map((j) => j.id);
  mlApi.jobs
    .closeJobs(jobIds)
    .then((resp) => {
      showResults(toastNotifications, resp, JOB_STATE.CLOSED);
      finish();
    })
    .catch((error) => {
      toastNotificationServiceProvider(toastNotifications).displayErrorToast(
        error,
        i18n.translate('xpack.ml.jobsList.closeJobErrorMessage', {
          defaultMessage: 'Jobs failed to close',
        })
      );
      finish();
    });
}

export function resetJobs(
  toastNotifications,
  mlApi,
  jobIds,
  deleteUserAnnotations,
  finish = () => {}
) {
  mlApi.jobs
    .resetJobs(jobIds, deleteUserAnnotations)
    .then((resp) => {
      showResults(toastNotifications, resp, JOB_ACTION.RESET);
      finish();
    })
    .catch((error) => {
      toastNotificationServiceProvider(toastNotifications).displayErrorToast(
        error,
        i18n.translate('xpack.ml.jobsList.resetJobErrorMessage', {
          defaultMessage: 'Jobs failed to reset',
        })
      );
      finish();
    });
}

export function deleteJobs(
  toastNotifications,
  mlApi,
  jobs,
  deleteUserAnnotations,
  deleteAlertingRules,
  finish = () => {}
) {
  const jobIds = jobs.map((j) => j.id);
  mlApi.jobs
    .deleteJobs(jobIds, deleteUserAnnotations, deleteAlertingRules)
    .then((resp) => {
      showResults(toastNotifications, resp, JOB_STATE.DELETED);
      finish();
    })
    .catch((error) => {
      toastNotificationServiceProvider(toastNotifications).displayErrorToast(
        error,
        i18n.translate('xpack.ml.jobsList.deleteJobErrorMessage', {
          defaultMessage: 'Jobs failed to delete',
        })
      );
      finish();
    });
}

export function filterJobs(jobs, clauses) {
  if (clauses.length === 0) {
    return jobs;
  }

  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return jobs which match all clauses, i.e. each search term is ANDed
  const matches = jobs.reduce((p, c) => {
    p[c.id] = {
      job: c,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let js = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on id, description and memory_status
      // if the term has been negated, AND the matches
      if (bool === true) {
        js = jobs.filter(
          (job) =>
            stringMatch(job.id, c.value) === bool ||
            stringMatch(job.description, c.value) === bool ||
            stringMatch(job.memory_status, c.value) === bool
        );
      } else {
        js = jobs.filter(
          (job) =>
            stringMatch(job.id, c.value) === bool &&
            stringMatch(job.description, c.value) === bool &&
            stringMatch(job.memory_status, c.value) === bool
        );
      }
    } else {
      // filter other clauses, i.e. the toggle group buttons
      if (Array.isArray(c.value)) {
        // if it's an array of job ids
        if (c.field === 'id') {
          js = jobs.filter((job) => c.value.indexOf(jobProperty(job, c.field)) >= 0);
        } else if (c.field === 'groups') {
          // the groups value is an array of group ids
          js = jobs.filter((job) => jobProperty(job, c.field).some((g) => c.value.indexOf(g) >= 0));
        } else if (c.field === 'job_tags') {
          js = jobTagFilter(jobs, c.value);
        }
      } else {
        if (c.field === 'job_tags') {
          js = js = jobTagFilter(jobs, [c.value]);
        } else {
          js = jobs.filter((job) => jobProperty(job, c.field) === c.value);
        }
      }
    }

    js.forEach((j) => matches[j.id].count++);
  });

  // loop through the matches and return only those jobs which have match all the clauses
  const filteredJobs = [];
  each(matches, (m) => {
    if (m.count >= clauses.length) {
      filteredJobs.push(m.job);
    }
  });
  return filteredJobs;
}

function jobProperty(job, prop) {
  const propMap = {
    job_state: 'jobState',
    datafeed_state: 'datafeedState',
    groups: 'groups',
    id: 'id',
    job_tags: 'jobTags',
  };
  return job[propMap[prop]];
}

function jobTagFilter(jobs, value) {
  return jobs.filter((job) => {
    const tags = jobProperty(job, 'job_tags');
    return Object.entries(tags)
      .map((t) => t.join(':'))
      .find((t) => value.some((t1) => t1 === t));
  });
}
