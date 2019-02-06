/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import template from 'plugins/security/views/management/users.html';
import 'plugins/security/services/shield_user';
import { SECURITY_PATH, USERS_PATH } from './management_urls';
import { Users } from '../../components/management/users';
import { createApiClient } from '../../lib/api';
import { I18nContext } from 'ui/i18n';
import { getUsersBreadcrumbs } from './breadcrumbs';

routes.when(SECURITY_PATH, {
  redirectTo: USERS_PATH,
});

const renderReact = (elem, httpClient, changeUrl) => {
  render(<I18nContext><Users changeUrl={changeUrl} apiClient={createApiClient(httpClient)} /></I18nContext>, elem);
};

routes.when(USERS_PATH, {
  template,
  k7Breadcrumbs: getUsersBreadcrumbs,
  controller($scope, $route, $q, confirmModal, $http, kbnUrl) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('usersReactRoot');
      if (elem) unmountComponentAtNode(elem);
    });
    $scope.$$postDigest(() => {
      const elem = document.getElementById('usersReactRoot');
      const changeUrl = (url) => {
        kbnUrl.change(url);
        $scope.$apply();
      };
      renderReact(elem, $http, changeUrl);
    });
  },
});
