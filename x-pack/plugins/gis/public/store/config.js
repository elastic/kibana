/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const INITIAL_STATE = {
  serviceSettings: null,
  mapConfig: null
};

// Reducer
function config(state = INITIAL_STATE, action) {
  switch (action.type) {
    default:
      return state;
  }
}

// Selectors
export const getServiceSettings = ({ config }) => config && config.serviceSettings
  || INITIAL_STATE.serviceSettings;
export const getMapConfig = ({ config }) => config && config.mapConfig
  || INITIAL_STATE.mapConfig;

export default config;
