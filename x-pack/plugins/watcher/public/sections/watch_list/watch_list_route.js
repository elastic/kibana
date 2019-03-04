/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import { management } from 'ui/management';
import template from './watch_list_route.html';
import 'plugins/watcher/services/license';
import { getWatchListBreadcrumbs } from '../../lib/breadcrumbs';
import { WatchList } from './components/watch_list';
import { setHttpClient } from '../../lib/api';
import { I18nContext } from 'ui/i18n';
import { manageAngularLifecycle } from '../../lib/manage_angular_lifecycle';

let elem;
const renderReact = async (elem, urlService) => {
  render(
    <I18nContext>
      <WatchList urlService={urlService} />
    </I18nContext>,
    elem
  );
};
routes
  .when('/management/elasticsearch/watcher/', {
    redirectTo: '/management/elasticsearch/watcher/watches/'
  });

routes
  .when('/management/elasticsearch/watcher/watches/', {
    template: template,
    controller: class WatchListRouteController {
      constructor($injector, $scope, $http, $rootScope, kbnUrl) {
        const $route = $injector.get('$route');
        this.watches = $route.current.locals.watches;
        // clean up previously rendered React app if one exists
        // this happens because of React Router redirects
        elem && unmountComponentAtNode(elem);
        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        setHttpClient($http);
        const urlService = {
          change(url) {
            kbnUrl.change(url);
            $rootScope.$digest();
          }
        };
        $scope.$$postDigest(() => {
          elem = document.getElementById('watchListReactRoot');
          renderReact(elem, urlService);
          manageAngularLifecycle($scope, $route, elem);
        });
      }

    },
    controllerAs: 'watchListRoute',
    k7Breadcrumbs: getWatchListBreadcrumbs,
  });

routes.defaults(/\/management/, {
  resolve: {
    watcherManagementSection: ($injector) => {
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
    }
  }
});
