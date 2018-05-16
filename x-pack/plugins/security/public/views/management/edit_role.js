/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import routes from 'ui/routes';
import { fatalError } from 'ui/notify';
import template from 'plugins/security/views/management/edit_role.html';
import 'angular-ui-select';
import 'plugins/security/services/application_privilege';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import 'plugins/security/services/shield_privileges';
import 'plugins/security/services/shield_indices';

import { IndexPatternsProvider } from 'ui/index_patterns/index_patterns';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { checkLicenseError } from 'plugins/security/lib/check_license_error';
import { EDIT_ROLES_PATH, ROLES_PATH } from './management_urls';

import { EditRolePage } from './edit_role/components/edit_role_page';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';


const getKibanaPrivileges = (kibanaApplicationPrivilege, role, application) => {
  const kibanaPrivileges = kibanaApplicationPrivilege.reduce((acc, p) => {
    acc[p.name] = false;
    return acc;
  }, {});

  if (!role.applications || role.applications.length === 0) {
    return kibanaPrivileges;
  }

  const applications = role.applications.filter(x => x.application === application);

  const assigned = _.uniq(_.flatten(_.pluck(applications, 'privileges')));
  assigned.forEach(a => {
    kibanaPrivileges[a] = true;
  });

  return kibanaPrivileges;
};

const getOtherApplications = (kibanaPrivileges, role, application) => {
  if (!role.applications || role.applications.length === 0) {
    return [];
  }

  return role.applications.map(x => x.application).filter(x => x !== application);
};

routes.when(`${EDIT_ROLES_PATH}/:name?`, {
  template,
  resolve: {
    role($route, ShieldRole, kbnUrl, Promise, Notifier) {
      const name = $route.current.params.name;
      if (name != null) {
        return ShieldRole.get({ name }).$promise
          .catch((response) => {

            if (response.status !== 404) {
              return fatalError(response);
            }

            const notifier = new Notifier();
            notifier.error(`No "${name}" role found.`);
            kbnUrl.redirect(ROLES_PATH);
            return Promise.halt();
          });
      }
      return new ShieldRole({
        cluster: [],
        indices: [],
        run_as: [],
        applications: []
      });
    },
    kibanaApplicationPrivilege(ApplicationPrivilege, kbnUrl, Promise, Private) {
      return ApplicationPrivilege.query().$promise
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

    $scope.role = $route.current.locals.role;
    $scope.users = $route.current.locals.users;
    $scope.indexPatterns = $route.current.locals.indexPatterns;

    $scope.rbacEnabled = rbacEnabled;
    const kibanaApplicationPrivilege = $route.current.locals.kibanaApplicationPrivilege;
    const role = $route.current.locals.role;
    $scope.kibanaPrivileges = getKibanaPrivileges(kibanaApplicationPrivilege, role, rbacApplication);
    $scope.otherApplications = getOtherApplications(kibanaApplicationPrivilege, role, rbacApplication);

    $scope.rolesHref = `#${ROLES_PATH}`;

    this.isNewRole = $route.current.params.name == null;
    this.fieldOptions = {};

    const xpackInfo = Private(XPackInfoProvider);
    const allowDocumentLevelSecurity = xpackInfo.get('features.security.allowRoleDocumentLevelSecurity');
    const allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');

    const domNode = document.getElementById('editRoleReactRoot');

    const {
      users,
      indexPatterns,
    } = $route.current.locals;

    this.fieldOptions = {};

    const roleToEdit = role.toJSON();
    if (roleToEdit.indices.length === 0) {
      roleToEdit.indices.push({
        names: [],
        privileges: [],
        field_security: {
          grant: ['*']
        }
      });
    }

    render(<EditRolePage
      runAsUsers={users}
      role={role.toJSON()}
      kibanaPrivileges={getKibanaPrivileges(kibanaApplicationPrivilege, role, rbacApplication)}
      otherApplications={getOtherApplications(kibanaApplicationPrivilege, role, rbacApplication)}
      indexPatterns={indexPatterns}
      rbacEnabled={rbacEnabled}
      spacesEnabled={true}
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

    $scope.union = _.flow(_.union, _.compact);
  }
});
