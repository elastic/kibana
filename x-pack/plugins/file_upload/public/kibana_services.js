/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let indexPatternService;
export let savedObjectsClient;
export let basePath;
export let kbnFetch;

export const setupInitServicesAndConstants = ({ http }) => {
  basePath = http.basePath.basePath;
  kbnFetch = http.fetch;
};

export const startInitServicesAndConstants = ({ savedObjects }, { data }) => {
  indexPatternService = data.indexPatterns;
  savedObjectsClient = savedObjects.client;
};
