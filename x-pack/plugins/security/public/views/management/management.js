/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/security/views/management/change_password_form/change_password_form';
import 'plugins/security/views/management/password_form/password_form';
import 'plugins/security/views/management/users';
import 'plugins/security/views/management/roles';
import 'plugins/security/views/management/edit_user';
import 'plugins/security/views/management/edit_role/index';
import 'plugins/security/views/management/management.less';
import routes from 'ui/routes';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import '../../services/shield_user';
import { ROLES_PATH, USERS_PATH } from './management_urls';

import { management } from 'ui/management';

routes.defaults(/\/management/, {
  resolve: {
    securityManagementSection: function (ShieldUser, Private) {
      const xpackInfo = Private(XPackInfoProvider);
      const showSecurityLinks = xpackInfo.get('features.security.showLinks');

      function deregisterSecurity() {
        management.deregister('security');
      }

      function ensureSecurityRegistered() {
        const registerSecurity = () => management.register('security', {
          display: 'Security',
          order: 10,
          icon: 'securityApp',
        });
        const getSecurity = () => management.getSection('security');

        const security = (management.hasItem('security')) ? getSecurity() : registerSecurity();

        if (!security.hasItem('users')) {
          security.register('users', {
            name: 'securityUsersLink',
            order: 10,
            display: 'Users',
            url: `#${USERS_PATH}`,
          });
        }

        if (!security.hasItem('roles')) {
          security.register('roles', {
            name: 'securityRolesLink',
            order: 20,
            display: 'Roles',
            url: `#${ROLES_PATH}`,
          });
        }
      }

      deregisterSecurity();
      if (!showSecurityLinks) return;

      // getCurrent will reject if there is no authenticated user, so we prevent them from seeing the security
      // management screens
      //
      // $promise is used here because the result is an ngResource, not a promise itself
      return ShieldUser.getCurrent().$promise
        .then(ensureSecurityRegistered)
        .catch(deregisterSecurity);
    }
  }
});
