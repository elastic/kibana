/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { each } from 'lodash';
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

export function filterJobs(jobs, clauses) {
  if (clauses.length === 0) {
    return jobs;
  }

  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return jobs which match all clauses, i.e. each search term is ANDed
  const matches = jobs.reduce((p, c) => {
    p[c.id] = {
      job: c,
      count: 0
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = (c.match === 'must');
    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on id, description and memory_status
      // if the term has been negated, AND the matches
      let js = [];

      if (bool === true) {
        js = jobs.filter(job => ((
          (stringMatch(job.id, c.value) === bool) ||
          (stringMatch(job.description, c.value) === bool) ||
          (stringMatch(job.memory_status, c.value) === bool)
        )));
      } else {
        js = jobs.filter(job => ((
          (stringMatch(job.id, c.value) === bool) &&
          (stringMatch(job.description, c.value) === bool) &&
          (stringMatch(job.memory_status, c.value) === bool)
        )));
      }
      js.forEach(j => (matches[j.id].count++));
    } else {
      // filter other clauses, i.e. the toggle group buttons
      // the groups value is an array of group ids
      let js = [];
      if (Array.isArray(c.value)) {
        js = jobs.filter(job => (jobProperty(job, c.field).some((g) => (c.value.indexOf(g) >= 0))));
      } else {
        js = jobs.filter(job => (jobProperty(job, c.field) === c.value));
      }

      js.forEach(j => (matches[j.id].count++));
    }
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

function stringMatch(str, substr) {
  return ((str.toLowerCase().match(substr.toLowerCase()) === null) === false);
}

function jobProperty(job, prop) {
  const propMap = {
    job_state: 'jobState',
    datafeed_state: 'datafeedState',
    groups: 'groups',
  };
  return job[propMap[prop]];
}

