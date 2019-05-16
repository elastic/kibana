/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import template from './account.html';
import '../../services/shield_user';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { AccountManagementPage } from './components';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

const renderReact = (elem, user) => {
  render(
    <I18nContext>
      <AccountManagementPage
        user={user}
      />
    </I18nContext>,
    elem
  );
};

routes.when('/account', {
  template,
  k7Breadcrumbs: () => [
    {
      text: i18n.translate('xpack.security.account.breadcrumb', {
        defaultMessage: 'Account Management',
      })
    }
  ],
  resolve: {
    user(ShieldUser) {
      return ShieldUser.getCurrent().$promise;
    }
  },
  controllerAs: 'accountController',
  controller($scope, $route) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('userProfileReactRoot');
      if (elem) {
        unmountComponentAtNode(elem);
      }
    });
    $scope.$$postDigest(() => {
      const elem = document.getElementById('userProfileReactRoot');
      renderReact(elem, $route.current.locals.user);
    });
  }
});
