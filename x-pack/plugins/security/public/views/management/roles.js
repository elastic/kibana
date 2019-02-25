/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import routes from 'ui/routes';
import { toastNotifications } from 'ui/notify';
import { toggle, toggleSort } from 'plugins/security/lib/util';
import { isRoleEnabled } from 'plugins/security/lib/role';
import template from 'plugins/security/views/management/roles.html';
import 'plugins/security/services/shield_role';
import { checkLicenseError } from 'plugins/security/lib/check_license_error';
import { ROLES_PATH, EDIT_ROLES_PATH } from './management_urls';
import { getRolesBreadcrumbs } from './breadcrumbs';

routes.when(ROLES_PATH, {
  template,
  k7Breadcrumbs: getRolesBreadcrumbs,
  resolve: {
    roles(ShieldRole, kbnUrl, Promise, Private) {
      // $promise is used here because the result is an ngResource, not a promise itself
      return ShieldRole.query()
        .$promise.catch(checkLicenseError(kbnUrl, Promise, Private))
        .catch(_.identity); // Return the error if there is one
    },
  },
  controller($scope, $route, $q, confirmModal, i18n) {
    $scope.roles = $route.current.locals.roles;
    $scope.forbidden = !_.isArray($scope.roles);
    $scope.selectedRoles = [];
    $scope.sort = { orderBy: 'name', reverse: false };
    $scope.editRolesHref = `#${EDIT_ROLES_PATH}`;
    $scope.getEditRoleHref = role => `#${EDIT_ROLES_PATH}/${role}`;

    $scope.deleteRoles = () => {
      const doDelete = () => {
        $q.all($scope.selectedRoles.map(role => role.$delete()))
          .then(() =>
            toastNotifications.addSuccess(
              i18n('xpack.security.management.roles.deleteRoleTitle', {
                defaultMessage: 'Deleted {value, plural, one {role} other {roles}}',
                values: {
                  value: $scope.selectedRoles.length,
                },
              })
            )
          )
          .then(() => {
            $scope.selectedRoles.map(role => {
              const i = $scope.roles.indexOf(role);
              $scope.roles.splice(i, 1);
            });
            $scope.selectedRoles.length = 0;
          });
      };
      const confirmModalOptions = {
        confirmButtonText: i18n('xpack.security.management.roles.deleteRoleConfirmButtonLabel', {
          defaultMessage: 'Delete role(s)',
        }),
        onConfirm: doDelete,
      };
      confirmModal(
        i18n('xpack.security.management.roles.deletingRolesWarningMessage', {
          defaultMessage:
            'Are you sure you want to delete the selected role(s)? This action is irreversible!',
        }),
        confirmModalOptions
      );
    };

    $scope.getSortArrowClass = field => {
      if ($scope.sort.orderBy === field) {
        return $scope.sort.reverse ? 'fa-long-arrow-down' : 'fa-long-arrow-up';
      }

      // Sort ascending by default.
      return 'fa-long-arrow-up';
    };

    $scope.toggleAll = () => {
      if ($scope.allSelected()) {
        $scope.selectedRoles.length = 0;
      } else {
        $scope.selectedRoles = getActionableRoles().slice();
      }
    };

    $scope.allSelected = () => {
      const roles = getActionableRoles();
      return roles.length && roles.length === $scope.selectedRoles.length;
    };

    $scope.isRoleEnabled = isRoleEnabled;

    $scope.toggle = toggle;
    $scope.includes = _.includes;
    $scope.toggleSort = toggleSort;

    function getActionableRoles() {
      return $scope.roles.filter(role => !role.metadata._reserved);
    }

    $scope.reversedTooltip = i18n('xpack.security.management.roles.reversedTooltip', {
      defaultMessage: 'Reserved roles are built-in and cannot be removed or modified. Only the password may be changed.',
    });

    $scope.reversedAriaLabel = i18n('xpack.security.management.roles.reversedAriaLabel', {
      defaultMessage: 'Reserved roles are built-in and cannot be removed or modified. Only the password may be changed.',
    });

  },
});
