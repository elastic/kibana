/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';

import { mlJobService } from 'plugins/ml/services/job_service';

// action values match the response from the endpoint.
// e.g. { started: true }
const ACTION = {
  START: 'started',
  STOP: 'stopped',
  DELETE: 'deleted',
};

export function isStartable(jobs) {
  return (jobs.find(j => j.datafeedState === 'stopped') !== undefined);
}

export function isStoppable(jobs) {
  return (jobs.find(j => j.datafeedState === 'started') !== undefined);
}

export function forceStartDatafeeds(jobs, start, end, finish) {
  const datafeedIds = jobs.filter(j => j.hasDatafeed).map(j => j.datafeedId);
  mlJobService.forceStartDatafeeds(datafeedIds, start, end)
    .then((resp) => {
      showResults(resp, ACTION.START);

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
      showResults(resp, ACTION.STOP);

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
  if (action === ACTION.START) {
    actionText = 'start';
    actionTextPT = 'started';
  } else if (action === ACTION.STOP) {
    actionText = 'stop';
    actionTextPT = 'stopped';
  } else if (action === ACTION.DELETE) {
    actionText = 'delete';
    actionTextPT = 'deleted';
  }

  if (successes.length > 0) {
    // const txt = (successes.length === 1) ? `${successes[0]}` : `${successes.length} jobs `;
    // toastNotifications.addSuccess(`${txt} ${actionTextPT} successfully`);
    successes.forEach((s) => {
      toastNotifications.addSuccess(`${s} ${actionTextPT} successfully`);
    });
  }

  if (failures.length > 0) {
    // const txt = (failures.length === 1) ? `${failures[0]}` : `${failures.length} jobs `;
    // toastNotifications.addDanger(`${txt} failed to ${actionText}`);
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
      toastNotifications.addDanger(`Could not clone ${jobId}, job could not be found`);
    });
}

export function deleteJobs(jobs, finish) {
  const jobIds = jobs.map(j => j.id);
  mlJobService.deleteJobs(jobIds)
  	.then((resp) => {
      showResults(resp, ACTION.DELETE);

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
