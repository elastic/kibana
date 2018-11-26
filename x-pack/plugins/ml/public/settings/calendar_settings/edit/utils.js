/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { ml } from 'plugins/ml/services/ml_api_service';
import { jobs } from 'plugins/ml/services/ml_api_service/jobs';
import { isJobIdValid } from 'plugins/ml/../common/util/job_utils';


function getJobIds() {
  return new Promise((resolve, reject) => {
    jobs.jobsSummary()
      .then((resp) => {
        resolve(resp.map((job) => ({ label: job.id })));
      })
      .catch((err) => {
        const errorMessage = `Error fetching job summaries: ${err}`;
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

function getGroupIds() {
  return new Promise((resolve, reject) => {
    jobs.groups()
      .then((resp) => {
        resolve(resp.map((group) => ({ label: group.id })));
      })
      .catch((err) => {
        const errorMessage = `Error loading groups: ${err}`;
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

function getCalendars() {
  return new Promise((resolve, reject) => {
    ml.calendars()
      .then((resp) => {
        resolve(resp);
      })
      .catch((err) => {
        const errorMessage = `Error loading calendars: ${err}`;
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

export function getCalendarSettingsData() {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await Promise.all([getJobIds(), getGroupIds(), getCalendars()]);

      const formattedData = {
        jobIds: data[0],
        groupIds: data[1],
        calendars: data[2]
      };
      resolve(formattedData);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

//  Calendar ID requires the same format as a Job ID, therefore isJobIdValid can be used
// TODO: rewrite this so we can use toast for our error messages
export function validateCalendarId(calendarId, checks) {
  let valid = true;

  _.each(checks, item => item.valid = true);

  if (calendarId === '' || calendarId === undefined) {
    checks.calendarId.valid = false;
  } else if (isJobIdValid(calendarId) === false) {
    checks.calendarId.valid = false;
    let msg = 'Calendar ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ';
    msg += 'must start and end with an alphanumeric character';
    checks.calendarId.message = msg;
  }

  _.each(checks, (item) => {
    if (item.valid === false) {
      valid = false;
    }
  });

  return valid;
}
