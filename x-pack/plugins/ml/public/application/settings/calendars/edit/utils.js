/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJobIdValid } from '../../../../../common/util/job_utils';
import { i18n } from '@kbn/i18n';

function getJobIds(mlApiServices) {
  return new Promise((resolve, reject) => {
    mlApiServices.jobs
      .jobsSummary()
      .then((resp) => {
        resolve(resp.map((job) => job.id));
      })
      .catch((err) => {
        const errorMessage = i18n.translate(
          'xpack.ml.calendarsEdit.errorWithFetchingJobSummariesErrorMessage',
          {
            defaultMessage: 'Error fetching job summaries: {err}',
            values: { err },
          }
        );
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

function getGroupIds(mlApiServices) {
  return new Promise((resolve, reject) => {
    mlApiServices.jobs
      .groups()
      .then((resp) => {
        resolve(resp.map((group) => group.id));
      })
      .catch((err) => {
        const errorMessage = i18n.translate(
          'xpack.ml.calendarsEdit.errorWithLoadingGroupsErrorMessage',
          {
            defaultMessage: 'Error loading groups: {err}',
            values: { err },
          }
        );
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

function getCalendars(mlApiServices) {
  return new Promise((resolve, reject) => {
    mlApiServices
      .calendars()
      .then((resp) => {
        resolve(resp);
      })
      .catch((err) => {
        const errorMessage = i18n.translate(
          'xpack.ml.calendarsEdit.errorWithLoadingCalendarsErrorMessage',
          {
            defaultMessage: 'Error loading calendars: {err}',
            values: { err },
          }
        );
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

export function getCalendarSettingsData(mlApiServices) {
  return new Promise(async (resolve, reject) => {
    try {
      const [jobIds, groupIds, calendars] = await Promise.all([
        getJobIds(mlApiServices),
        getGroupIds(mlApiServices),
        getCalendars(mlApiServices),
      ]);

      resolve({
        jobIds,
        groupIds,
        calendars,
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

export function validateCalendarId(calendarId) {
  let valid = true;

  if (calendarId === '' || calendarId === undefined) {
    valid = false;
  } else if (isJobIdValid(calendarId) === false) {
    valid = false;
  }

  return valid;
}

export function generateTempId() {
  return Math.random().toString(36).substr(2, 9);
}
