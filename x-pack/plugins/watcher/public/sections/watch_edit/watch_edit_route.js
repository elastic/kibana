/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import 'ui/url';
import { toastNotifications } from 'ui/notify';
import template from './watch_edit_route.html';
import 'plugins/watcher/services/watch';
import './components/json_watch_edit';
import { setHttpClient } from '../../lib/api';
import './components/threshold_watch_edit';
import { WATCH_TYPES } from 'plugins/watcher/../common/constants';
import { updateWatchSections } from 'plugins/watcher/lib/update_management_sections';
import { I18nContext } from 'ui/i18n';
import 'plugins/watcher/services/license';
import { getWatchDetailBreadcrumbs } from '../../lib/breadcrumbs';
import { manageAngularLifecycle } from '../../lib/manage_angular_lifecycle';
import { WatchEdit } from './components/watch_edit';

let elem;
const renderReact = async (elem, watchType, watchId, savedObjectsClient, kbnUrl, licenseService) => {
  render(
    <I18nContext>
      <WatchEdit
        watchId={watchId}
        watchType={watchType}
        savedObjectsClient={savedObjectsClient}
        kbnUrl={kbnUrl}
        licenseService={licenseService}
      />
    </I18nContext>,
    elem
  );
};
routes
  .when('/management/elasticsearch/watcher/watches/watch/:id/edit')
  .when('/management/elasticsearch/watcher/watches/new-watch/:watchType')
  .defaults(
    /management\/elasticsearch\/watcher\/watches\/(new-watch\/:watchType|watch\/:id\/edit)/,
    {
      template: template,
      k7Breadcrumbs: getWatchDetailBreadcrumbs,
      controller: class WatchEditRouteController {
        constructor($injector, $scope, $http, Private) {
          const $route = $injector.get('$route');
          const kbnUrl = $injector.get('kbnUrl');
          const licenseService = $injector.get('xpackWatcherLicenseService');
          this.watch = $route.current.locals.xpackWatch;
          this.WATCH_TYPES = WATCH_TYPES;
          const watchId = $route.current.params.id;
          const watchType = $route.current.params.watchType;
          // clean up previously rendered React app if one exists
          // this happens because of React Router redirects
          elem && unmountComponentAtNode(elem);
          // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
          // e.g. to check license status per request.
          setHttpClient($http);
          $scope.$$postDigest(() => {
            elem = document.getElementById('watchEditReactRoot');
            const savedObjectsClient = Private(SavedObjectsClientProvider);

            renderReact(elem, watchType, watchId, savedObjectsClient, kbnUrl, licenseService);
            manageAngularLifecycle($scope, $route, elem);
          });
        }
      },
      controllerAs: 'watchEditRoute',
      resolve: {
        watchTabs: $injector => {
          const $route = $injector.get('$route');
          const watchId = $route.current.params.id;
          updateWatchSections(watchId);
        },
        xpackWatch: function ($injector) {
          const $route = $injector.get('$route');
          const watchService = $injector.get('xpackWatcherWatchService');
          const licenseService = $injector.get('xpackWatcherLicenseService');
          const kbnUrl = $injector.get('kbnUrl');
          const watchId = $route.current.params.id;
          const watchType = $route.current.params.watchType;

          if (!watchId) {
            return licenseService
              .refreshLicense()
              .then(() => {
                return watchService.newWatch(watchType);
              })
              .catch(err => {
                return licenseService.checkValidity().then(() => {
                  if (err.status !== 403) {
                    toastNotifications.addDanger(err.data.message);
                  }

                  kbnUrl.redirect('/management/elasticsearch/watcher/watches');
                  return Promise.reject();
                });
              });
          }

          return watchService.loadWatch(watchId).catch(err => {
            return licenseService.checkValidity().then(() => {
              if (err.status !== 403) {
                toastNotifications.addDanger(err.data.message);
              }

              kbnUrl.redirect('/management/elasticsearch/watcher/watches');
              return Promise.reject();
            });
          });
        },
        checkLicense: $injector => {
          const licenseService = $injector.get('xpackWatcherLicenseService');
          return licenseService.checkValidity();
        },
      },
    }
  );
