/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import routes from 'ui/routes';
import { fatalError } from 'ui/notify';
import template from 'plugins/security/views/management/edit_role/edit_role.html';
import 'plugins/security/views/management/edit_role/edit_role.less';
import 'angular-ui-select';
import 'plugins/security/services/application_privilege';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import 'plugins/security/services/shield_privileges';
import 'plugins/security/services/shield_indices';

import { IndexPatternsProvider } from 'ui/index_patterns/index_patterns';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { checkLicenseError } from 'plugins/security/lib/check_license_error';
import { EDIT_ROLES_PATH, ROLES_PATH } from '../management_urls';

import { EditRolePage } from './components';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

routes.when(`${EDIT_ROLES_PATH}/:name?`, {
  template,
  resolve: {
    role($route, ShieldRole, kbnUrl, Promise, Notifier) {
      const name = $route.current.params.name;

      let role;

      if (name != null) {
        role = ShieldRole.get({ name }).$promise
          .catch((response) => {

            if (response.status !== 404) {
              return fatalError(response);
            }

            const notifier = new Notifier();
            notifier.error(`No "${name}" role found.`);
            kbnUrl.redirect(ROLES_PATH);
            return Promise.halt();
          });

      } else {
        role = Promise.resolve(new ShieldRole({
          cluster: [],
          indices: [],
          run_as: [],
          applications: []
        }));
      }

      return role.then(roleToEdit => {
        if (roleToEdit.indices.length === 0) {
          roleToEdit.indices.push({
            names: [],
            privileges: [],
            field_security: {
              grant: ['*']
            }
          });
        }
        return roleToEdit;
      });

    },
    kibanaApplicationPrivilege(ApplicationPrivilege, kbnUrl, Promise, Private) {
      return ApplicationPrivilege.query().$promise
        .then(privileges => privileges.map(p => p.toJSON()))
        .catch(checkLicenseError(kbnUrl, Promise, Private));
    },
    users(ShieldUser, kbnUrl, Promise, Private) {
      // $promise is used here because the result is an ngResource, not a promise itself
      return ShieldUser.query().$promise
        .then(users => _.map(users, 'username'))
        .catch(checkLicenseError(kbnUrl, Promise, Private));
    },
    indexPatterns(Private) {
      const indexPatterns = Private(IndexPatternsProvider);
      return indexPatterns.getTitles();
    }
  },
  controllerAs: 'editRole',
  controller($injector, $scope, $http, rbacEnabled, rbacApplication) {
    const $route = $injector.get('$route');
    const Private = $injector.get('Private');

    const Notifier = $injector.get('Notifier');

    const kibanaApplicationPrivilege = $route.current.locals.kibanaApplicationPrivilege;
    const role = $route.current.locals.role;

    const xpackInfo = Private(XPackInfoProvider);
    const allowDocumentLevelSecurity = xpackInfo.get('features.security.allowRoleDocumentLevelSecurity');
    const allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');

    const domNode = document.getElementById('editRoleReactRoot');

    const {
      users,
      indexPatterns,
    } = $route.current.locals;

    render(<EditRolePage
      runAsUsers={users}
      role={role}
      kibanaAppPrivileges={kibanaApplicationPrivilege}
      indexPatterns={indexPatterns}
      rbacEnabled={rbacEnabled}
      rbacApplication={rbacApplication}
      httpClient={$http}
      breadcrumbs={routes.getBreadcrumbs()}
      allowDocumentLevelSecurity={allowDocumentLevelSecurity}
      allowFieldLevelSecurity={allowFieldLevelSecurity}
      notifier={Notifier}
    />, domNode);

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      unmountComponentAtNode(domNode);
    });
  }
});
