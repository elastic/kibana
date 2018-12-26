/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export
const getAllCrumbNames = (i18n) => ({
  jobs: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.jobs', { defaultMessage: 'Job Management' }),
    url: '#/jobs',
  },
  new_job: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.new_job', { defaultMessage: 'Create New Job' }),
    url: '#/jobs/new_job',
  },
  single_metric: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.single_metric', { defaultMessage: 'Single Metric Job' }),
    url: '',
  },
  multi_metric: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.multi_metric', { defaultMessage: 'Multi Metric job' }),
    url: '',
  },
  population: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.population', { defaultMessage: 'Population job' }),
    url: '',
  },
  advanced: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.advanced', { defaultMessage: 'Advanced Job Configuration' }),
    url: '',
  },
  datavisualizer: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.datavisualizer', { defaultMessage: 'Data Visualizer' }),
    url: '',
  },
  filedatavisualizer: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.filedatavisualizer', { defaultMessage: 'File Data Visualizer (Experimental)' }),
    url: '',
  },
  explorer: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.explorer', { defaultMessage: 'Anomaly Explorer' }),
    url: '#/explorer',
  },
  timeseriesexplorer: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.timeseriesexplorer', { defaultMessage: 'Single Metric Viewer' }),
    url: '#/timeseriesexplorer',
  },
  settings: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.settings', { defaultMessage: 'Settings' }),
    url: '#/settings',
  },
  calendars_list: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.calendars_list', { defaultMessage: 'Calendar Management' }),
    url: '#/settings/calendars_list',
  },
  new_calendar: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.new_calendar', { defaultMessage: 'New Calendar' }),
    url: '#/settings/calendars_list/new_calendar',
  },
  edit_calendar: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.edit_calendar', { defaultMessage: 'Edit Calendar' }),
    url: '#/settings/calendars_list/edit_calendar',
  },
  filter_lists: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.filter_lists', { defaultMessage: 'Filter Lists' }),
    url: '#/settings/filter_lists',
  },
  new_filter_list: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.new_filter_list', { defaultMessage: 'New Filter List' }),
    url: '#/settings/filter_lists/new',
  },
  edit_filter_list: {
    label: i18n('xpack.ml.navMenu.breadcrumbs.edit_filter_list', { defaultMessage: 'Edit Filter List' }),
    url: '#/settings/filter_lists/edit',
  },
});

export
const getBaseBreadcrumbs = (i18n) => [
  {
    label: i18n('xpack.ml.navMenu.breadcrumbs.mlBase', { defaultMessage: 'Machine Learning' }),
    url: '#/',
  }
];
