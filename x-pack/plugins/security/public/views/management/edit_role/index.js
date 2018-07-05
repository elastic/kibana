/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
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

      return role.then(res => res.toJSON());
    },
    kibanaApplicationPrivilege(ApplicationPrivileges, kbnUrl, Promise, Private) {
      return ApplicationPrivileges.query().$promise
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
  controller($injector, $scope, $http) {
    const $route = $injector.get('$route');
    const Private = $injector.get('Private');

    const Notifier = $injector.get('Notifier');

    const kibanaApplicationPrivilege = $route.current.locals.kibanaApplicationPrivilege;
    const role = $route.current.locals.role;

    const xpackInfo = Private(XPackInfoProvider);
    const allowDocumentLevelSecurity = xpackInfo.get('features.security.allowRoleDocumentLevelSecurity');
    const allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');
    const rbacApplication = chrome.getInjected('rbacApplication');

    const domNode = document.getElementById('editRoleReactRoot');

    const {
      users,
      indexPatterns,
    } = $route.current.locals;

    const routeBreadcrumbs = routes.getBreadcrumbs();

    render(<EditRolePage
      runAsUsers={users}
      role={role}
      kibanaAppPrivileges={kibanaApplicationPrivilege}
      indexPatterns={indexPatterns}
      rbacEnabled={true}
      rbacApplication={rbacApplication}
      httpClient={$http}
      breadcrumbs={transformBreadcrumbs(routeBreadcrumbs)}
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

function transformBreadcrumbs(routeBreadcrumbs) {
  const indexOfEdit = routeBreadcrumbs.findIndex(b => b.id === 'edit');

  const hasEntryAfterEdit = indexOfEdit >= 0 && indexOfEdit < (routeBreadcrumbs.length - 1);

  if (hasEntryAfterEdit) {
    // The entry after 'edit' is the name of the role being edited (if any). We don't want to use the "humanized" version of the role name here
    const roleName = routeBreadcrumbs[indexOfEdit + 1];
    roleName.display = roleName.id;
  }

  return routeBreadcrumbs.filter(b => b.id !== 'edit');
}
