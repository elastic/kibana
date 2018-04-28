/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { get } from 'lodash';
import 'ui/autoload/styles';
import 'plugins/security/views/login/login.less';
import chrome from 'ui/chrome';
import { parseNext } from 'plugins/security/lib/parse_next';
import template from 'plugins/security/views/login/login.html';

const messageMap = {
  SESSION_EXPIRED: 'Your session has expired. Please log in again.'
};

chrome
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController('login', function ($http, $window, secureCookies, loginState) {
    const basePath = chrome.getBasePath();
    const next = parseNext($window.location.href, basePath);
    const isSecure = !!$window.location.protocol.match(/^https/);
    const self = this;

    function setupScope() {
      const defaultLoginMessage = 'Login is currently disabled because the license could not be determined. '
    + 'Please check that Elasticsearch is running, then refresh this page.';

      self.allowLogin = loginState.allowLogin;
      self.loginMessage = loginState.loginMessage || defaultLoginMessage;
      self.infoMessage = get(messageMap, parse($window.location.href, true).query.msg);
      self.isDisabled = !isSecure && secureCookies;
      self.isLoading = false;
      self.submit = (username, password) => {
        self.isLoading = true;
        self.error = false;
        $http.post('./api/security/v1/login', { username, password }).then(
          () => $window.location.href = next,
          () => {
            setupScope();
            self.error = true;
            self.isLoading = false;
          }
        );
      };
    }

    setupScope();
  });
