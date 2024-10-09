/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { isJobIdValid } from '../../../../../common/util/job_utils';
import type { MlApi } from '../../../services/ml_api_service';

function getJobIds(mlApi: MlApi) {
  return new Promise((resolve, reject) => {
    mlApi.jobs
      .jobsSummary([])
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
        // eslint-disable-next-line no-console
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

function getGroupIds(mlApi: MlApi) {
  return new Promise((resolve, reject) => {
    mlApi.jobs
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
        // eslint-disable-next-line no-console
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

function getCalendars(mlApi: MlApi) {
  return new Promise((resolve, reject) => {
    mlApi
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
        // eslint-disable-next-line no-console
        console.log(errorMessage);
        reject(errorMessage);
      });
  });
}

export function getCalendarSettingsData(mlApi: MlApi) {
  return new Promise(async (resolve, reject) => {
    try {
      const [jobIds, groupIds, calendars] = await Promise.all([
        getJobIds(mlApi),
        getGroupIds(mlApi),
        getCalendars(mlApi),
      ]);

      resolve({
        jobIds,
        groupIds,
        calendars,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      reject(error);
    }
  });
}

export function validateCalendarId(calendarId: string) {
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
