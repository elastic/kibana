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
import './account.less';
import '../../services/shield_user';
import { GateKeeperProvider } from 'plugins/xpack_main/services/gate_keeper';

routes.when('/account', {
  template,
  resolve: {
    tribeRedirect(Private) {
      const gateKeeper = Private(GateKeeperProvider);
      gateKeeper.redirectAndNotifyIfTribe();
    },

    user(ShieldUser) {
      return ShieldUser.getCurrent();
    }
  },
  controllerAs: 'accountController',
  controller($scope, $route, Notifier) {
    $scope.user = $route.current.locals.user;

    const notifier = new Notifier();

    $scope.saveNewPassword = (newPassword, currentPassword, onSuccess, onIncorrectPassword) => {
      $scope.user.newPassword = newPassword;
      if (currentPassword) {
        // If the currentPassword is null, we shouldn't send it.
        $scope.user.password = currentPassword;
      }

      $scope.user.$changePassword()
        .then(() => toastNotifications.addSuccess('Updated password'))
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
      return '(No email)';
    };
  }
});
