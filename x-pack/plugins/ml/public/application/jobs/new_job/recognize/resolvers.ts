/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getToastNotifications, getSavedObjectsClient } from '../../../util/dependency_cache';
import { mlJobService } from '../../../services/job_service';
import { ml } from '../../../services/ml_api_service';
import { KibanaObjects } from './page';

/**
 * Checks whether the jobs in a data recognizer module have been created.
 * Redirects to the Anomaly Explorer to view the jobs if they have been created,
 * or the recognizer job wizard for the module if not.
 */
export function checkViewOrCreateJobs(moduleId: string, indexPatternId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Load the module, and check if the job(s) in the module have been created.
    // If so, load the jobs in the Anomaly Explorer.
    // Otherwise open the data recognizer wizard for the module.
    // Always want to call reject() so as not to load original page.
    ml.dataRecognizerModuleJobsExist({ moduleId })
      .then((resp: any) => {
        if (resp.jobsExist === true) {
          const resultsPageUrl = mlJobService.createResultsUrlForJobs(resp.jobs, 'explorer');
          window.location.href = resultsPageUrl;
          reject();
        } else {
          window.location.href = `#/jobs/new_job/recognize?id=${moduleId}&index=${indexPatternId}`;
          reject();
        }
      })
      .catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.error(`Error checking whether jobs in module ${moduleId} exists`, err);
        const toastNotifications = getToastNotifications();
        toastNotifications.addWarning({
          title: i18n.translate('xpack.ml.newJob.recognize.moduleCheckJobsExistWarningTitle', {
            defaultMessage: 'Error checking module {moduleId}',
            values: { moduleId },
          }),
          text: i18n.translate('xpack.ml.newJob.recognize.moduleCheckJobsExistWarningDescription', {
            defaultMessage:
              'An error occurred trying to check whether the jobs in the module have been created.',
          }),
        });

        window.location.href = '#/jobs';
        reject();
      });
  });
}

/**
 * Gets kibana objects with an existence check.
 */
export const checkForSavedObjects = async (objects: KibanaObjects): Promise<KibanaObjects> => {
  const savedObjectsClient = getSavedObjectsClient();
  try {
    return await Object.keys(objects).reduce(async (prevPromise, type) => {
      const acc = await prevPromise;
      const { savedObjects } = await savedObjectsClient.find<any>({
        type,
        perPage: 1000,
      });

      acc[type] = objects[type].map((obj) => {
        const find = savedObjects.find((savedObject) => savedObject.attributes.title === obj.title);
        return {
          ...obj,
          exists: !!find,
          id: (!!find && find.id) || obj.id,
        };
      });
      return Promise.resolve(acc);
    }, Promise.resolve({} as KibanaObjects));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Could not load saved objects', e);
  }
  return Promise.resolve(objects);
};
