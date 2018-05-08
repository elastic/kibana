/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import 'ui/url';
import { Notifier } from 'ui/notify';
import template from './watch_history_item_route.html';
import 'plugins/watcher/services/watch';
import 'plugins/watcher/services/watch_history';
import './components/watch_history_item';
import { updateHistorySection } from 'plugins/watcher/lib/update_management_sections';

routes
  .when('/management/elasticsearch/watcher/watches/watch/:watchId/history-item/:watchHistoryItemId', {
    template: template,
    resolve: {
      watch: function ($injector) {
        const $route = $injector.get('$route');
        const watchService = $injector.get('xpackWatcherWatchService');
        const kbnUrl = $injector.get('kbnUrl');

        const notifier = new Notifier({ location: 'Watcher' });

        const watchId = $route.current.params.watchId;

        return watchService.loadWatch(watchId)
          .catch(err => {
            if (err.status !== 403) {
              notifier.error(err);
            }

            kbnUrl.redirect('/management/elasticsearch/watcher/watches');
            return Promise.reject();
          });
      },
      watchHistoryItem: function ($injector) {
        const $route = $injector.get('$route');
        const $filter = $injector.get('$filter');
        const moment = $filter('moment');
        const watchHistoryService = $injector.get('xpackWatcherWatchHistoryService');
        const kbnUrl = $injector.get('kbnUrl');

        const notifier = new Notifier({ location: 'Watcher' });

        const watchId = $route.current.params.watchId;
        const watchHistoryItemId = $route.current.params.watchHistoryItemId;

        return watchHistoryService.loadWatchHistoryItem(watchHistoryItemId)
          .then(historyItem => {
            const display = moment(historyItem.startTime);
            updateHistorySection(display);

            return historyItem;
          })
          .catch(err => {
            if (err.status !== 403) {
              notifier.error(err);
            }

            kbnUrl.redirect(`/management/elasticsearch/watcher/watches/watch/${watchId}/status`);
            return Promise.reject();
          });
      }
    },
    controllerAs: 'watchHistoryItemRoute',
    controller: class WatchHistoryItemRouteController {
      constructor($injector) {
        const $route = $injector.get('$route');

        this.watch = $route.current.locals.watch;
        this.watchHistoryItem = $route.current.locals.watchHistoryItem;
      }
    }
  });
