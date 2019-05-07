/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import routes from 'ui/routes';
import template from 'plugins/security/views/management/edit_user/edit_user.html';
import 'angular-resource';
import 'ui/angular_ui_select';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import { EDIT_USERS_PATH } from '../management_urls';
import { EditUserPage } from './components';
import { UserAPIClient } from '../../../lib/api';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { getEditUserBreadcrumbs, getCreateUserBreadcrumbs } from '../breadcrumbs';

const renderReact = (elem, httpClient, changeUrl, username) => {
  render(
    <I18nContext>
      <EditUserPage
        changeUrl={changeUrl}
        username={username}
        apiClient={new UserAPIClient()}
      />
    </I18nContext>,
    elem
  );
};

routes.when(`${EDIT_USERS_PATH}/:username?`, {
  template,
  k7Breadcrumbs: ($injector, $route) => $injector.invoke(
    $route.current.params.username
      ? getEditUserBreadcrumbs
      : getCreateUserBreadcrumbs
  ),
  controllerAs: 'editUser',
  controller($scope, $route, kbnUrl, $http) {
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
