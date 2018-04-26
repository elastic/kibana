/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import 'ui/url';
import { Notifier } from 'ui/notify';
import template from './watch_detail_route.html';
import 'plugins/watcher/services/watch';
import './components/watch_detail';
import { WATCH_HISTORY } from '../../../common/constants';
import { updateWatchSections } from 'plugins/watcher/lib/update_management_sections';
import 'plugins/watcher/services/license';

routes
  .when('/management/elasticsearch/watcher/watches/watch/:id', {
    redirectTo: '/management/elasticsearch/watcher/watches/watch/:id/status'
  });

routes
  .when('/management/elasticsearch/watcher/watches/watch/:id/status', {
    template: template,
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

        const notifier = new Notifier({ location: 'Watcher' });

        const watchId = $route.current.params.id;

        return watchService.loadWatch(watchId)
          .catch(err => {
            if (err.status !== 403) {
              notifier.error(err);
            }

            kbnUrl.redirect('/management/elasticsearch/watcher/watches');
            return Promise.reject();
          });
      },
      watchHistoryItems: function ($injector) {
        const $route = $injector.get('$route');
        const watchService = $injector.get('xpackWatcherWatchService');
        const kbnUrl = $injector.get('kbnUrl');

        const notifier = new Notifier({ location: 'Watcher' });

        const watchId = $route.current.params.id;

        return watchService.loadWatchHistory(watchId, WATCH_HISTORY.INITIAL_RANGE)
          .catch(err => {
            if (err.status !== 403) {
              notifier.error(err);
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
      constructor($injector) {
        const $route = $injector.get('$route');
        this.initialHistoryRange = $route.current.locals.initialHistoryRange;
        this.watch = $route.current.locals.watch;
        this.watchHistoryItems = $route.current.locals.watchHistoryItems;
      }
    }
  });
