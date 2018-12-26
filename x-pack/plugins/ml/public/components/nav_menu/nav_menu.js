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

import { getAllCrumbNames, getBaseBreadcrumbs } from './get_crumbs';
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

        const crumbNames = getAllCrumbNames(i18n);
        const breadcrumbs = getBaseBreadcrumbs(i18n);

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
