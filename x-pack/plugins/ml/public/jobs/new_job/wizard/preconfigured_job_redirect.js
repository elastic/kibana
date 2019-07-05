/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import chrome from 'ui/chrome';
import { get } from  'lodash';
import { WIZARD_TYPE } from 'plugins/ml/jobs/new_job/simple/components/constants/general';
import { mlJobService } from 'plugins/ml/services/job_service';
import { loadIndexPatterns, getIndexPatternIdFromName } from 'plugins/ml/util/index_utils';

export function preConfiguredJobRedirect(AppState, Private, courier) {
  return new Promise((resolve, reject) => {
    const basePath = `${chrome.getBasePath()}/app/ml#`;

    const stateDefaults = {
      mlJobSettings: {}
    };
    const appState = new AppState(stateDefaults);

    let redirectUrl = getWizardUrlFromAppState(appState);
    if (redirectUrl === null) {
      // no settings in appState
      const job = mlJobService.currentJob;
      if (job) {
        loadIndexPatterns(Private, courier)
          .then(() => {
            redirectUrl = getWizardUrlFromCloningJob(job);
            if (redirectUrl === null) {
              // no created_by setting in job, use advanced job creation
              window.location.href = `${basePath}/jobs/new_job/advanced`;
              reject();
            } else {
              window.location.href = `${basePath}/${redirectUrl}`;
              reject();
            }
          })
          .catch((error) => {
            console.log(error);
            resolve();
          });
      } else {
        // no settings in appState or temp cloning job
        // don't redirect
        resolve();
      }
    } else {
      // settings in appState
      window.location.href = `${basePath}/${redirectUrl}`;
      reject();
    }
  });
}

function getWizardUrlFromAppState(appState) {
  if (appState.mlJobSettings !== undefined && Object.keys(appState.mlJobSettings).length) {
    let page = '';
    const jobSettings = appState.mlJobSettings;
    if (jobSettings.fields && jobSettings.fields.length) {
      if (jobSettings.fields.length > 1 || jobSettings.split !== undefined) {
        // multi-metric or population
        if (jobSettings.population !== undefined) {
          page = 'population';
        } else {
          page = 'multi_metric';
        }
      } else {
        // single metric
        page = 'single_metric';
      }
    }
    return `jobs/new_job/simple/${page}`;
  } else {
    return null;
  }
}

function getWizardUrlFromCloningJob(job) {
  const created = get(job, 'custom_settings.created_by');
  let page = '';
  if (created !== undefined) {

    if (created === WIZARD_TYPE.SINGLE_METRIC) {
      page = 'single_metric';
    } else if (created === WIZARD_TYPE.MULTI_METRIC) {
      page = 'multi_metric';
    } else if (created === WIZARD_TYPE.POPULATION) {
      page = 'population';
    } else {
      return null;
    }
    const indexPatternId = getIndexPatternIdFromName(job.datafeed_config.indices[0]);

    return `jobs/new_job/simple/${page}?index=${indexPatternId}&_g=()`;
  } else {
    return null;
  }
}
