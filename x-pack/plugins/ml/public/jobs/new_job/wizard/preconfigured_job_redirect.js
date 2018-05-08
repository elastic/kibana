/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function preConfiguredJobRedirect(Promise, $location, AppState) {
  return new Promise((resolve, reject) => {

    const stateDefaults = {
      mlJobSettings: {}
    };
    const appState = new AppState(stateDefaults);

    const redirectUrl = getRedirectUrl(appState);
    if (redirectUrl === null) {
      return resolve();
    } else {
      $location.path(redirectUrl);
      return reject();
    }
  });
}

function getRedirectUrl(appState) {
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
