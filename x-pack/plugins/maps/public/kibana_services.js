/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let indexPatternService;
export let timeFilter;

export const initKibanaServices = ({ data }) => {
  indexPatternService = data.indexPatterns;
  timeFilter: data.query.timefilter
};
