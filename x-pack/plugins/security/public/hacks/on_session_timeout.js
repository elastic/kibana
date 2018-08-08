/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { isSystemApiRequest } from 'ui/system_api';
import { PathProvider } from 'plugins/xpack_main/services/path';
import 'plugins/security/services/auto_logout';

/**
 * Client session timeout is decreased by this number so that Kibana server
 * can still access session content during logout request to properly clean
 * user session up (invalidate access tokens, redirect to logout portal etc.).
 * @type {number}
 */
const SESSION_TIMEOUT_GRACE_PERIOD_MS = 5000;

const module = uiModules.get('security', []);
module.config(($httpProvider) => {
  $httpProvider.interceptors.push(($timeout, $window, $q, $injector, sessionTimeout, Notifier, Private, autoLogout) => {
    const isLoginOrLogout = Private(PathProvider).isLoginOrLogout();
    const notifier = new Notifier();
    const notificationLifetime = 60 * 1000;
    const notificationOptions = {
      type: 'warning',
      content: 'You will soon be logged out due to inactivity. Click OK to resume.',
      icon: 'warning',
      title: 'Warning',
      lifetime: Math.min(
        (sessionTimeout - SESSION_TIMEOUT_GRACE_PERIOD_MS),
        notificationLifetime
      ),
      actions: ['accept']
    };

    let pendingNotification;
    let activeNotification;

    function clearNotifications() {
      if (pendingNotification) $timeout.cancel(pendingNotification);
      if (activeNotification) activeNotification.clear();
    }

    function scheduleNotification() {
      pendingNotification = $timeout(showNotification, Math.max(sessionTimeout - notificationLifetime, 0));
    }

    function showNotification() {
      activeNotification = notifier.add(notificationOptions, (action) => {
        if (action === 'accept') {
          // Make a simple request to keep the session alive
          $injector.get('es').ping();
        } else {
          autoLogout();
        }
      });
    }

    function interceptorFactory(responseHandler) {
      return function interceptor(response) {
        if (!isLoginOrLogout && !isSystemApiRequest(response.config) && sessionTimeout !== null) {
          clearNotifications();
          scheduleNotification();
        }
        return responseHandler(response);
      };
    }

    return {
      response: interceptorFactory(_.identity),
      responseError: interceptorFactory($q.reject)
    };
  });
});
