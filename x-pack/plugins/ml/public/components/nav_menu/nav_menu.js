/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import $ from 'jquery';
import template from './nav_menu.html';
import uiRouter from 'ui/routes';
import chrome from 'ui/chrome';
import { isFullLicense } from '../../license/check_license';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlNavMenu', function (config, i18n) {
  return {
    restrict: 'E',
    transclude: true,
    template,
    link: function (scope, el, attrs) {

      // Tabs
      scope.name = attrs.name;

      scope.showTabs = false;
      if (scope.name === 'jobs' ||
        scope.name === 'settings' ||
        scope.name === 'datavisualizer' ||
        scope.name === 'filedatavisualizer' ||
        scope.name === 'timeseriesexplorer' ||
        scope.name === 'explorer') {
        scope.showTabs = true;
      }
      scope.isActiveTab = function (path) {
        return scope.name === path;
      };

      scope.disableLinks = (isFullLicense() === false);

      // TODO - once the k7design flag is disabled, this should all be removed.
      const isK7Design = chrome.getUiSettingsClient().get('k7design', false);
      if (isK7Design === false) {
        // Breadcrumbs

        const crumbNames = {
          jobs: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.jobManagementLabel', { defaultMessage: 'Job Management' }),
            url: '#/jobs'
          },
          new_job: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.createNewJobLabel', { defaultMessage: 'Create New Job' }),
            url: '#/jobs/new_job'
          },
          single_metric: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.singleMetricJobLabel', { defaultMessage: 'Single Metric Job' }),
            url: ''
          },
          multi_metric: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.multiMetricJobLabel', { defaultMessage: 'Multi Metric job' }),
            url: ''
          },
          population: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.populationJobLabel', { defaultMessage: 'Population job' }),
            url: ''
          },
          advanced: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.advancedJobConfigurationLabel', { defaultMessage: 'Advanced Job Configuration' }),
            url: ''
          },
          datavisualizer: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.dataVisualizerLabel', { defaultMessage: 'Data Visualizer' }),
            url: ''
          },
          filedatavisualizer: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.fileDataVisualizerLabel', { defaultMessage: 'File Data Visualizer (Experimental)' }),
            url: ''
          },
          explorer: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.anomalyExplorerLabel', { defaultMessage: 'Anomaly Explorer' }),
            url: '#/explorer'
          },
          timeseriesexplorer: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.singleMetricViewerLabel', { defaultMessage: 'Single Metric Viewer' }),
            url: '#/timeseriesexplorer'
          },
          settings: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.settingsLabel', { defaultMessage: 'Settings' }),
            url: '#/settings'
          },
          calendars_list: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.calendarManagementLabel', { defaultMessage: 'Calendar Management' }),
            url: '#/settings/calendars_list'
          },
          new_calendar: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.newCalendarLabel', { defaultMessage: 'New Calendar' }),
            url: '#/settings/calendars_list/new_calendar'
          },
          edit_calendar: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.editCalendarLabel', { defaultMessage: 'Edit Calendar' }),
            url: '#/settings/calendars_list/edit_calendar'
          },
          filter_lists: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.filterListsLabel', { defaultMessage: 'Filter Lists' }),
            url: '#/settings/filter_lists'
          },
          new_filter_list: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.newFilterListLabel', { defaultMessage: 'New Filter List' }),
            url: '#/settings/filter_lists/new'
          },
          edit_filter_list: {
            label: i18n('xpack.ml.navMenu.breadcrumbs.editFilterListLabel', { defaultMessage: 'Edit Filter List' }),
            url: '#/settings/filter_lists/edit'
          },
        };
        const breadcrumbs = [{
          label: i18n('xpack.ml.navMenu.breadcrumbs.machineLearningLabel', { defaultMessage: 'Machine Learning' }),
          url: '#/'
        }];

        // get crumbs from url
        const crumbs = uiRouter.getBreadcrumbs();
        if (crumbs.length > 1) {
          crumbs.forEach((crumb) => {
            breadcrumbs.push(crumbNames[crumb.id]);
          });
        }

        scope.breadcrumbs = breadcrumbs.filter(Boolean);

        config.watch('k7design', (val) => scope.showPluginBreadcrumbs = !val);
        chrome.breadcrumbs.set(scope.breadcrumbs.map(b => ({ text: b.label, href: b.url })));

        // when the page loads, focus on the first breadcrumb
        el.ready(() => {
          const $crumbs = $('.kuiLocalBreadcrumbs a');
          if ($crumbs.length) {
            $crumbs[0].focus();
          }
        });
      }

    }
  };
});
