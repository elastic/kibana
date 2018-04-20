/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import 'ui/url';
import { Notifier } from 'ui/notify';
import template from './watch_edit_route.html';
import 'plugins/watcher/services/watch';
import './components/json_watch_edit';
import './components/threshold_watch_edit';
import { WATCH_TYPES } from 'plugins/watcher/../common/constants';
import { updateWatchSections } from 'plugins/watcher/lib/update_management_sections';
import 'plugins/watcher/services/license';

routes
  .when('/management/elasticsearch/watcher/watches/watch/:id/edit')
  .when('/management/elasticsearch/watcher/watches/new-watch/:watchType')
  .defaults(/management\/elasticsearch\/watcher\/watches\/(new-watch\/:watchType|watch\/:id\/edit)/, {
    template: template,
    controller: class WatchEditRouteController {
      constructor($injector) {
        const $route = $injector.get('$route');
        this.watch = $route.current.locals.xpackWatch;
        this.WATCH_TYPES = WATCH_TYPES;
      }
    },
    controllerAs: 'watchEditRoute',
    resolve: {
      watchTabs: ($injector) => {
        const $route = $injector.get('$route');
        const watchId = $route.current.params.id;
        updateWatchSections(watchId);
      },
      xpackWatch: function ($injector) {
        const $route = $injector.get('$route');
        const watchService = $injector.get('xpackWatcherWatchService');
        const licenseService = $injector.get('xpackWatcherLicenseService');
        const kbnUrl = $injector.get('kbnUrl');

        const notifier = new Notifier({ location: 'Watcher' });

        const watchId = $route.current.params.id;
        const watchType = $route.current.params.watchType;

        if (!watchId) {
          return licenseService.refreshLicense()
            .then(() => {
              return watchService.newWatch(watchType);
            })
            .catch(err => {
              return licenseService.checkValidity()
                .then(() => {
                  if (err.status !== 403) {
                    notifier.error(err);
                  }

                  kbnUrl.redirect('/management/elasticsearch/watcher/watches');
                  return Promise.reject();
                });
            });
        }

        return watchService.loadWatch(watchId)
          .catch(err => {
            return licenseService.checkValidity()
              .then(() => {
                if (err.status !== 403) {
                  notifier.error(err);
                }

                kbnUrl.redirect('/management/elasticsearch/watcher/watches');
                return Promise.reject();
              });
          });
      },
      checkLicense: ($injector) => {
        const licenseService = $injector.get('xpackWatcherLicenseService');
        return licenseService.checkValidity();
      }
    }
  });
