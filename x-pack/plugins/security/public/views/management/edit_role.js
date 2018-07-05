/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { fatalError, toastNotifications } from 'ui/notify';
import { toggle } from 'plugins/security/lib/util';
import { isRoleEnabled } from 'plugins/security/lib/role';
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
import { ALL_RESOURCE } from '../../../common/constants';

const getKibanaPrivileges = (applicationPrivileges, roleApplications, application) => {
  const kibanaPrivileges = applicationPrivileges.reduce((acc, p) => {
    acc[p.name] = false;
    return acc;
  }, {});

  if (!roleApplications || roleApplications.length === 0) {
    return kibanaPrivileges;
  }

  // we're filtering out privileges for non-all resources incase the roles were created in a future version
  const applications = roleApplications
    .filter(roleApplication => roleApplication.application === application)
    .filter(roleApplication => !roleApplication.resources.some(resource => resource !== ALL_RESOURCE));

  const assigned = _.uniq(_.flatten(_.pluck(applications, 'privileges')));
  assigned.forEach(a => {
    // we don't want to display privileges that aren't in our expected list of privileges
    if (a in kibanaPrivileges) {
      kibanaPrivileges[a] = true;
    }
  });

  return kibanaPrivileges;
};

const getRoleApplications = (kibanaPrivileges, currentRoleApplications = [], application) => {
  // we keep any other applications
  const newRoleApplications = currentRoleApplications.filter(roleApplication => {
    return roleApplication.application !== application;
  });

  const selectedPrivileges = Object.keys(kibanaPrivileges).filter(key => kibanaPrivileges[key]);

  // if we have any selected privileges, add a single application entry
  if (selectedPrivileges.length > 0) {
    newRoleApplications.push({
      application,
      privileges: selectedPrivileges,
      resources: [ALL_RESOURCE]
    });
  }

  return newRoleApplications;
};

const getOtherApplications = (roleApplications, application) => {
  if (!roleApplications || roleApplications.length === 0) {
    return [];
  }

  return roleApplications.map(roleApplication => roleApplication.application).filter(app =>app !== application);
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
    applicationPrivileges(ApplicationPrivileges, kbnUrl, Promise, Private) {
      return ApplicationPrivileges.query().$promise
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
  controller($injector, $scope) {
    const $route = $injector.get('$route');
    const kbnUrl = $injector.get('kbnUrl');
    const shieldPrivileges = $injector.get('shieldPrivileges');
    const Notifier = $injector.get('Notifier');
    const Private = $injector.get('Private');
    const confirmModal = $injector.get('confirmModal');
    const shieldIndices = $injector.get('shieldIndices');
    const rbacApplication = chrome.getInjected('rbacApplication');

    $scope.role = $route.current.locals.role;
    $scope.users = $route.current.locals.users;
    $scope.indexPatterns = $route.current.locals.indexPatterns;
    $scope.privileges = shieldPrivileges;

    const applicationPrivileges = $route.current.locals.applicationPrivileges;
    const role = $route.current.locals.role;
    $scope.kibanaPrivileges = getKibanaPrivileges(applicationPrivileges, role.applications, rbacApplication);
    $scope.otherApplications = getOtherApplications(role.applications, rbacApplication);

    $scope.rolesHref = `#${ROLES_PATH}`;

    this.isNewRole = $route.current.params.name == null;
    this.fieldOptions = {};

    const notifier = new Notifier();

    $scope.deleteRole = (role) => {
      const doDelete = () => {
        role.$delete()
          .then(() => toastNotifications.addSuccess('Deleted role'))
          .then($scope.goToRoleList)
          .catch(error => notifier.error(_.get(error, 'data.message')));
      };
      const confirmModalOptions = {
        confirmButtonText: 'Delete role',
        onConfirm: doDelete
      };
      confirmModal('Are you sure you want to delete this role? This action is irreversible!', confirmModalOptions);
    };

    $scope.saveRole = (role) => {
      role.indices = role.indices.filter((index) => index.names.length);
      role.indices.forEach((index) => index.query || delete index.query);

      role.applications = getRoleApplications($scope.kibanaPrivileges, role.applications, rbacApplication);

      return role.$save()
        .then(() => toastNotifications.addSuccess('Updated role'))
        .then($scope.goToRoleList)
        .catch(error => notifier.error(_.get(error, 'data.message')));
    };

    $scope.goToRoleList = () => {
      kbnUrl.redirect(ROLES_PATH);
    };

    $scope.addIndex = indices => {
      indices.push({ names: [], privileges: [], field_security: { grant: ['*'] } });
    };

    $scope.areIndicesValid = (indices) => {
      return indices
        .filter((index) => index.names.length)
        .find((index) => index.privileges.length === 0) == null;
    };

    $scope.fetchFieldOptions = (index) => {
      const indices = index.names.join(',');
      const fieldOptions = this.fieldOptions;
      if (indices && fieldOptions[indices] == null) {
        shieldIndices.getFields(indices)
          .then((fields) => fieldOptions[indices] = fields)
          .catch(() => fieldOptions[indices] = []);
      }
    };

    $scope.isRoleEnabled = isRoleEnabled;

    const xpackInfo = Private(XPackInfoProvider);
    $scope.allowDocumentLevelSecurity = xpackInfo.get('features.security.allowRoleDocumentLevelSecurity');
    $scope.allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');

    $scope.$watch('role.indices', (indices) => {
      if (!indices.length) $scope.addIndex(indices);
      else indices.forEach($scope.fetchFieldOptions);
    }, true);

    $scope.toggle = toggle;
    $scope.includes = _.includes;

    $scope.union = _.flow(_.union, _.compact);
  }
});
