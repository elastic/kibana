/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const WeightedCreateDatasourceSteps = [
  'selectConfig',
  'selectPackage',
  'configure',
  'review',
];

export const CREATE_DATASOURCE_STEP_PATHS = {
  selectConfig: '/select-config',
  selectPackage: '/select-package',
  configure: '/configure',
  review: '/review',
};
