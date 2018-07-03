/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';

import { mlJobService } from 'plugins/ml/services/job_service';
import { ml } from 'plugins/ml/services/ml_api_service';
import { DATAFEED_STATE } from 'plugins/ml/../common/constants/states';

export function loadFullJob(jobId) {
  return new Promise((resolve, reject) => {
    ml.jobs.jobs(jobId)
      .then((jobs) => {
        if (jobs.length) {
          resolve(jobs[0]);
        } else {
          reject(`Could not find job ${jobId}`);
        }
      })
      .catch(() => {
        reject(`Could not find job ${jobId}`);
      });
  });
}

export function isStartable(jobs) {
  return (jobs.find(j => j.datafeedState === DATAFEED_STATE.STOPPED) !== undefined);
}

export function isStoppable(jobs) {
  return (jobs.find(j => j.datafeedState === DATAFEED_STATE.STARTED) !== undefined);
}

export function forceStartDatafeeds(jobs, start, end, finish) {
  const datafeedIds = jobs.filter(j => j.hasDatafeed).map(j => j.datafeedId);
  mlJobService.forceStartDatafeeds(datafeedIds, start, end)
    .then((resp) => {
      showResults(resp, DATAFEED_STATE.STARTED);

      if (typeof finish === 'function') {
        finish();
      }
    })
    .catch((error) => {
      toastNotifications.addDanger(`Jobs failed to start`, error);
      if (typeof finish === 'function') {
        finish();
      }
    });
}


export function stopDatafeeds(jobs, finish) {
  const datafeedIds = jobs.filter(j => j.hasDatafeed).map(j => j.datafeedId);
  mlJobService.stopDatafeeds(datafeedIds)
  	.then((resp) => {
      showResults(resp, DATAFEED_STATE.STOPPED);

      if (typeof finish === 'function') {
        finish();
      }
    })
    .catch((error) => {
      toastNotifications.addDanger(`Jobs failed to stop`, error);
      if (typeof finish === 'function') {
        finish();
      }
    });
}

function showResults(resp, action) {
  const successes = [];
  const failures = [];
  for (const d in resp) {
    if (resp[d][action]) {
      successes.push(d);
    } else {
      failures.push(d);
    }
  }

  let actionText = '';
  let actionTextPT = '';
  if (action === DATAFEED_STATE.STARTED) {
    actionText = 'start';
    actionTextPT = 'started';
  } else if (action === DATAFEED_STATE.STOPPED) {
    actionText = 'stop';
    actionTextPT = 'stopped';
  } else if (action === DATAFEED_STATE.DELETED) {
    actionText = 'delete';
    actionTextPT = 'deleted';
  }

  if (successes.length > 0) {
    successes.forEach((s) => {
      toastNotifications.addSuccess(`${s} ${actionTextPT} successfully`);
    });
  }

  if (failures.length > 0) {
    failures.forEach((s) => {
      toastNotifications.addDanger(`${s} failed to ${actionText}`);
    });
  }
}

export function cloneJob(jobId) {
  mlJobService.refreshJob(jobId)
  	.then(() => {
      mlJobService.currentJob =  mlJobService.getJob(jobId);
      window.location.href = `#/jobs/new_job/advanced`;
    })
    .catch(() => {
      toastNotifications.addDanger(`Could not clone ${jobId}. Job could not be found`);
    });
}

export function deleteJobs(jobs, finish) {
  const jobIds = jobs.map(j => j.id);
  mlJobService.deleteJobs(jobIds)
  	.then((resp) => {
      showResults(resp, DATAFEED_STATE.DELETED);

      if (typeof finish === 'function') {
        finish();
      }
    })
    .catch((error) => {
      toastNotifications.addDanger(`Jobs failed to delete`, error);
      if (typeof finish === 'function') {
        finish();
      }
    });
}
