/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ML_BREADCRUMB } from '../breadcrumbs';


export function getJobManagementBreadcrumbs() {
  // Whilst top level nav menu with tabs remains,
  // use root ML breadcrumb.
  return [
    ML_BREADCRUMB
  ];
}

export function getCreateJobBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    {
      text: 'Create job',
      href: '#/jobs/new_job'
    }
  ];
}

export function getCreateSingleMetricJobBreadcrumbs() {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: 'Single metric',
      href: ''
    }
  ];
}

export function getCreateMultiMetricJobBreadcrumbs() {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: 'Multi metric',
      href: ''
    }
  ];
}

export function getCreatePopulationJobBreadcrumbs() {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: 'Population',
      href: ''
    }
  ];
}

export function getAdvancedJobConfigurationBreadcrumbs() {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: 'Advanced configuration',
      href: ''
    }
  ];
}

export function getCreateRecognizerJobBreadcrumbs($routeParams) {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: $routeParams.id,
      href: ''
    }
  ];
}

export function getDataVisualizerIndexOrSearchBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    {
      text: 'Select index or search',
      href: ''
    }
  ];
}
