/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import routes from 'ui/routes';
import 'ui/url';
import { toastNotifications } from 'ui/notify';
import template from './watch_detail_route.html';
import 'plugins/watcher/services/watch';
import { WATCH_HISTORY } from '../../../common/constants';
import { updateWatchSections } from 'plugins/watcher/lib/update_management_sections';
import 'plugins/watcher/services/license';
import { getWatchDetailBreadcrumbs } from '../../lib/breadcrumbs';
import { setHttpClient } from '../../lib/api';
import { manageAngularLifecycle } from '../../lib/manage_angular_lifecycle';
import './components/watch_detail';
import { WatchDetail } from './components/watch_detail/watch_detail_component';
import { WatchHistory } from './components/watch_detail/watch_history_component';
import { I18nContext } from 'ui/i18n';
import { EuiPageContent, EuiSpacer } from '@elastic/eui';

let elem;
const renderReact = async (elem, watchId, kbnUrlService) => {
  render(
    <I18nContext>
      <EuiPageContent>
        <WatchDetail watchId={watchId}/>
        <EuiSpacer size="xxl"/>
        <WatchHistory watchId={watchId} urlService={kbnUrlService}/>
      </EuiPageContent>
    </I18nContext>,
    elem
  );
};

routes
  .when('/management/elasticsearch/watcher/watches/watch/:id', {
    redirectTo: '/management/elasticsearch/watcher/watches/watch/:id/status'
  });

routes
  .when('/management/elasticsearch/watcher/watches/watch/:id/status', {
    template: template,
    k7Breadcrumbs: getWatchDetailBreadcrumbs,
    resolve: {
      watchTabs: ($injector) => {
        const $route = $injector.get('$route');
        const watchId = $route.current.params.id;
        updateWatchSections(watchId);
      },
      initialHistoryRange: function () {
        return WATCH_HISTORY.INITIAL_RANGE;
      },
      watch: function ($injector) {
        const $route = $injector.get('$route');
        const watchService = $injector.get('xpackWatcherWatchService');
        const kbnUrl = $injector.get('kbnUrl');

        const watchId = $route.current.params.id;

        return watchService.loadWatch(watchId)
          .catch(err => {
            if (err.status !== 403) {
              toastNotifications.addDanger(err.data.message);
            }

            kbnUrl.redirect('/management/elasticsearch/watcher/watches');
            return Promise.reject();
          });
      },
      watchHistoryItems: function ($injector) {
        const $route = $injector.get('$route');
        const watchService = $injector.get('xpackWatcherWatchService');
        const kbnUrl = $injector.get('kbnUrl');

        const watchId = $route.current.params.id;

        return watchService.loadWatchHistory(watchId, WATCH_HISTORY.INITIAL_RANGE)
          .catch(err => {
            if (err.status !== 403) {
              toastNotifications.addDanger(err.data.message);
            }

            kbnUrl.redirect('/management/elasticsearch/watcher/watches');
            return Promise.reject();
          });
      },
      checkLicense: ($injector) => {
        const licenseService = $injector.get('xpackWatcherLicenseService');
        return licenseService.checkValidity();
      }
    },
    controllerAs: 'watchDetailRoute',
    controller: class WatchDetailRouteController {
      constructor($injector, $scope, $http) {
        const $route = $injector.get('$route');
        const kbnUrlService = $injector.get('kbnUrl');
        this.initialHistoryRange = $route.current.locals.initialHistoryRange;
        this.watch = $route.current.locals.watch;
        this.watchHistoryItems = $route.current.locals.watchHistoryItems;
        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        setHttpClient($http);
        $scope.$$postDigest(() => {
          elem = document.getElementById('watchDetailReactRoot');
          renderReact(elem, $route.current.params.id, kbnUrlService);
          manageAngularLifecycle($scope, $route, elem);
        });
      }
    }
  });
