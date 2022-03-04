/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';
import { i18n } from '@kbn/i18n';

import { mlJobService } from '../../../services/job_service';
import {
  getToastNotificationService,
  toastNotificationServiceProvider,
} from '../../../services/toast_notification_service';
import { getToastNotifications } from '../../../util/dependency_cache';
import { ml } from '../../../services/ml_api_service';
import { stringMatch } from '../../../util/string_utils';
import { getDataViewNames } from '../../../util/index_utils';
import { JOB_STATE, DATAFEED_STATE } from '../../../../../common/constants/states';
import { JOB_ACTION } from '../../../../../common/constants/job_actions';
import { parseInterval } from '../../../../../common/util/parse_interval';
import { mlCalendarService } from '../../../services/calendar_service';
import { isPopulatedObject } from '../../../../../common/util/object_utils';

export function loadFullJob(jobId) {
  return new Promise((resolve, reject) => {
    ml.jobs
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

export function loadJobForCloning(jobId) {
  return new Promise((resolve, reject) => {
    ml.jobs
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

export function forceStartDatafeeds(jobs, start, end, finish = () => {}) {
  const datafeedIds = jobs.filter((j) => j.hasDatafeed).map((j) => j.datafeedId);
  mlJobService
    .forceStartDatafeeds(datafeedIds, start, end)
    .then((resp) => {
      showResults(resp, DATAFEED_STATE.STARTED);
      finish();
    })
    .catch((error) => {
      const toastNotifications = getToastNotifications();
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.jobsList.startJobErrorMessage', {
          defaultMessage: 'Jobs failed to start',
        }),
        error
      );
      finish();
    });
}

export function stopDatafeeds(jobs, finish = () => {}) {
  const datafeedIds = jobs.filter((j) => j.hasDatafeed).map((j) => j.datafeedId);
  mlJobService
    .stopDatafeeds(datafeedIds)
    .then((resp) => {
      showResults(resp, DATAFEED_STATE.STOPPED);
      finish();
    })
    .catch((error) => {
      const toastNotifications = getToastNotifications();
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.jobsList.stopJobErrorMessage', {
          defaultMessage: 'Jobs failed to stop',
        }),
        error
      );
      finish();
    });
}

function showResults(resp, action) {
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

  const toastNotifications = getToastNotifications();
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

export async function cloneJob(jobId) {
  try {
    const [{ job: cloneableJob, datafeed }, originalJob] = await Promise.all([
      loadJobForCloning(jobId),
      loadFullJob(jobId, false),
    ]);

    const dataViewNames = await getDataViewNames();
    const dataViewTitle = datafeed.indices.join(',');
    const jobIndicesAvailable = dataViewNames.includes(dataViewTitle);

    if (jobIndicesAvailable === false) {
      const warningText = i18n.translate(
        'xpack.ml.jobsList.managementActions.noSourceDataViewForClone',
        {
          defaultMessage:
            'Unable to clone the anomaly detection job {jobId}. No data view exists for index {dataViewTitle}.',
          values: { jobId, dataViewTitle },
        }
      );
      getToastNotificationService().displayDangerToast(warningText, {
        'data-test-subj': 'mlCloneJobNoDataViewExistsWarningToast',
      });
      return;
    }

    if (cloneableJob !== undefined && originalJob?.custom_settings?.created_by !== undefined) {
      // if the job is from a wizards, i.e. contains a created_by property
      // use tempJobCloningObjects to temporarily store the job
      mlJobService.tempJobCloningObjects.createdBy = originalJob?.custom_settings?.created_by;
      mlJobService.tempJobCloningObjects.job = cloneableJob;

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

        mlJobService.tempJobCloningObjects.start = start;
        mlJobService.tempJobCloningObjects.end = end;
      }
    } else {
      // otherwise use the tempJobCloningObjects
      mlJobService.tempJobCloningObjects.job = cloneableJob;
      // resets the createdBy field in case it still retains previous settings
      mlJobService.tempJobCloningObjects.createdBy = undefined;
    }
    if (datafeed !== undefined) {
      mlJobService.tempJobCloningObjects.datafeed = datafeed;
    }

    if (originalJob.calendars) {
      mlJobService.tempJobCloningObjects.calendars = await mlCalendarService.fetchCalendarsByIds(
        originalJob.calendars
      );
    }

    window.location.href = '#/jobs/new_job';
  } catch (error) {
    getToastNotificationService().displayErrorToast(
      error,
      i18n.translate('xpack.ml.jobsList.cloneJobErrorMessage', {
        defaultMessage: 'Could not clone {jobId}. Job could not be found',
        values: { jobId },
      })
    );
  }
}

export function closeJobs(jobs, finish = () => {}) {
  const jobIds = jobs.map((j) => j.id);
  mlJobService
    .closeJobs(jobIds)
    .then((resp) => {
      showResults(resp, JOB_STATE.CLOSED);
      finish();
    })
    .catch((error) => {
      getToastNotificationService().displayErrorToast(
        error,
        i18n.translate('xpack.ml.jobsList.closeJobErrorMessage', {
          defaultMessage: 'Jobs failed to close',
        })
      );
      finish();
    });
}

export function resetJobs(jobIds, finish = () => {}) {
  mlJobService
    .resetJobs(jobIds)
    .then((resp) => {
      showResults(resp, JOB_ACTION.RESET);
      finish();
    })
    .catch((error) => {
      getToastNotificationService().displayErrorToast(
        error,
        i18n.translate('xpack.ml.jobsList.resetJobErrorMessage', {
          defaultMessage: 'Jobs failed to reset',
        })
      );
      finish();
    });
}

export function deleteJobs(jobs, finish = () => {}) {
  const jobIds = jobs.map((j) => j.id);
  mlJobService
    .deleteJobs(jobIds)
    .then((resp) => {
      showResults(resp, JOB_STATE.DELETED);
      finish();
    })
    .catch((error) => {
      getToastNotificationService().displayErrorToast(
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
// check to see if a job has been stored in mlJobService.tempJobCloningObjects
// if it has, return an object with the minimum properties needed for the
// start datafeed modal.
export function checkForAutoStartDatafeed() {
  const job = mlJobService.tempJobCloningObjects.job;
  const datafeed = mlJobService.tempJobCloningObjects.datafeed;
  if (job !== undefined) {
    mlJobService.tempJobCloningObjects.job = undefined;
    mlJobService.tempJobCloningObjects.datafeed = undefined;
    mlJobService.tempJobCloningObjects.createdBy = undefined;

    const hasDatafeed = isPopulatedObject(datafeed);
    const datafeedId = hasDatafeed ? datafeed.datafeed_id : '';
    return {
      id: job.job_id,
      hasDatafeed,
      latestTimestampSortValue: 0,
      datafeedId,
    };
  }
}
