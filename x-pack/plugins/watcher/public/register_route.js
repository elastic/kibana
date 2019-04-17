/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import routes from 'ui/routes';
import { management } from 'ui/management';
import template from './app.html';
import { App } from './app';
import 'plugins/watcher/services/license';
import { getWatchListBreadcrumbs } from './lib/breadcrumbs';
import { setHttpClient, setSavedObjectsClient } from './lib/api';
import { setUrlService } from './lib/navigation';
import { I18nContext } from 'ui/i18n';
import { manageAngularLifecycle } from './lib/manage_angular_lifecycle';
import { LicenseServiceContext } from './license_service_context';

let elem;
const renderReact = async (elem, licenseService) => {
  render(
    <I18nContext>
      <LicenseServiceContext.Provider value={licenseService}>
        <App />
      </LicenseServiceContext.Provider>
    </I18nContext>,
    elem
  );
};
routes.when('/management/elasticsearch/watcher/:param1?/:param2?/:param3?/:param4?', {
  template,
  controller: class WatcherController {
    constructor($injector, $scope, $http, Private, kbnUrl, $rootScope) {
      const $route = $injector.get('$route');
      const licenseService = $injector.get('xpackWatcherLicenseService');
      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      elem && unmountComponentAtNode(elem);
      setSavedObjectsClient(Private(SavedObjectsClientProvider));
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);
      setUrlService({
        change(url) {
          kbnUrl.change(url);
          $rootScope.$digest();
        },
        redirect(url) {
          kbnUrl.redirect(url);
          $rootScope.$digest();
        }
      });
      $scope.$$postDigest(() => {
        elem = document.getElementById('watchReactRoot');
        renderReact(elem, licenseService);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  },
  controllerAs: 'watchRoute',
  //TODO: fix breadcrumbs
  k7Breadcrumbs: getWatchListBreadcrumbs,
});

routes.defaults(/\/management/, {
  resolve: {
    watcherManagementSection: $injector => {
      const licenseService = $injector.get('xpackWatcherLicenseService');
      const watchesSection = management.getSection('elasticsearch/watcher');

      if (licenseService.showLinks) {
        watchesSection.show();
      } else {
        watchesSection.hide();
      }

      if (licenseService.enableLinks) {
        watchesSection.enable();
        watchesSection.tooltip = '';
      } else {
        watchesSection.disable();
        watchesSection.tooltip = licenseService.message;
      }
    },
  },
});
