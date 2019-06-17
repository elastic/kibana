/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum JOB_TYPE {
  SINGLE_METRIC,
  MULTI_METRIC,
  POPULATION,
}

export function getJobTypeFromUrlParam(urlParam: string): JOB_TYPE {
  switch (urlParam) {
    case 'single_metric':
      return JOB_TYPE.SINGLE_METRIC;
    case 'multi_metric':
      return JOB_TYPE.MULTI_METRIC;
    case 'population':
      return JOB_TYPE.POPULATION;
    default:
      return JOB_TYPE.SINGLE_METRIC;
  }
}
