/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import routes from 'ui/routes';
import template from './account.html';
import '../management/change_password_form/change_password_form';
import '../../services/shield_user';
import { i18n } from '@kbn/i18n';
import { REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE } from '../../../common/constants';

routes.when('/account', {
  template,
  k7Breadcrumbs: () => [
    {
      text: i18n.translate('xpack.security.account.breadcrumb', {
        defaultMessage: 'Account',
      })
    }
  ],
  resolve: {
    user(ShieldUser) {
      return ShieldUser.getCurrent().$promise;
    }
  },
  controllerAs: 'accountController',
  controller($scope, $route, Notifier, config, i18n) {
    $scope.user = $route.current.locals.user;

    const notifier = new Notifier();

    const { authentication_realm: authenticationRealm } = $scope.user;
    $scope.showChangePassword = REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE.includes(authenticationRealm.type);

    $scope.saveNewPassword = (newPassword, currentPassword, onSuccess, onIncorrectPassword) => {
      $scope.user.newPassword = newPassword;
      if (currentPassword) {
        // If the currentPassword is null, we shouldn't send it.
        $scope.user.password = currentPassword;
      }

      $scope.user.$changePassword()
        .then(() => toastNotifications.addSuccess({
          title: i18n('xpack.security.account.updatedPasswordTitle', {
            defaultMessage: 'Updated password'
          }),
          'data-test-subj': 'passwordUpdateSuccess',
        }))
        .then(onSuccess)
        .catch(error => {
          if (error.status === 401) {
            onIncorrectPassword();
          }
          else notifier.error(_.get(error, 'data.message'));
        });
    };

    this.getEmail = () => {
      if ($scope.user.email) return $scope.user.email;
      return i18n('xpack.security.account.noEmailMessage', {
        defaultMessage: '(No email)'
      });
    };
  }
});
