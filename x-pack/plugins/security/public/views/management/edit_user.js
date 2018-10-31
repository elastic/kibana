/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import routes from 'ui/routes';
import template from 'plugins/security/views/management/edit_user.html';
import 'angular-resource';
import 'angular-ui-select';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import { EDIT_USERS_PATH } from './management_urls';
import { EditUser } from '../../components/management/users';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { createApiClient } from '../../lib/api';
import { I18nProvider } from '@kbn/i18n/react';

const renderReact = (elem, httpClient, changeUrl, username) => {
  render(
    <I18nProvider>
      <EditUser
        changeUrl={changeUrl}
        apiClient={createApiClient(httpClient)}
        username={username}
      />
    </I18nProvider>,
    elem
  );
};

routes.when(`${EDIT_USERS_PATH}/:username?`, {
  template,
  controllerAs: 'editUser',
  controller($scope, $route, kbnUrl, Notifier, confirmModal, $http) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('editUserReactRoot');
      if (elem) {
        unmountComponentAtNode(elem);
      }
    });
    $scope.$$postDigest(() => {
      const elem = document.getElementById('editUserReactRoot');
      const username = $route.current.params.username;
      const changeUrl = (url) => {
        kbnUrl.change(url);
        $scope.$apply();
      };
      renderReact(elem, $http, changeUrl, username);
    });
  },
});
