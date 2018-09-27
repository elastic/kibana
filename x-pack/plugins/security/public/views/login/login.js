/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { parse } from 'url';
import { get } from 'lodash';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { parseNext } from 'plugins/security/lib/parse_next';
import template from 'plugins/security/views/login/login_react.html';
import { LoginPage } from 'plugins/security/views/login/components/login_page';
import './login.less';
const messageMap = {
  SESSION_EXPIRED: 'Your session has timed out. Please log in again.'
};

chrome
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController('login', function ($scope, $http, $window, secureCookies, loginState) {
    const basePath = chrome.getBasePath();
    const next = parseNext($window.location.href, basePath);
    const isSecure = !!$window.location.protocol.match(/^https/);

    $scope.$$postDigest(() => {
      const domNode = document.getElementById('reactLoginRoot');

      render((
        <LoginPage
          http={$http}
          window={$window}
          infoMessage={get(messageMap, parse($window.location.href, true).query.msg)}
          loginState={loginState}
          isSecureConnection={isSecure}
          requiresSecureConnection={secureCookies}
          next={next}
        />
      ), domNode);
    });

  });
