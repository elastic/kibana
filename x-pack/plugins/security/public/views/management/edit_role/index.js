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
import 'angular-ui-select';
import 'plugins/security/services/application_privilege';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import 'plugins/security/services/shield_privileges';
import 'plugins/security/services/shield_indices';

import { IndexPatternsProvider } from 'ui/index_patterns/index_patterns';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { SpacesManager } from '../../../../../spaces/public/lib';
import { UserProfileProvider } from 'plugins/xpack_main/services/user_profile';
import { checkLicenseError } from 'plugins/security/lib/check_license_error';
import { EDIT_ROLES_PATH, ROLES_PATH } from '../management_urls';
import { getEditRoleBreadcrumbs, getCreateRoleBreadcrumbs } from '../breadcrumbs';

import { EditRolePage } from './components';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { KibanaAppPrivileges } from '../../../../common/model/kibana_privilege';
import { I18nContext } from 'ui/i18n';

routes.when(`${EDIT_ROLES_PATH}/:name?`, {
  template,
  k7Breadcrumbs: ($injector, $route) => $injector.invoke(
    $route.current.params.name
      ? getEditRoleBreadcrumbs
      : getCreateRoleBreadcrumbs
  ),
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
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: {
            global: [],
            space: {},
          },
          _unrecognized_applications: [],
        }));
      }

      return role.then(res => res.toJSON());
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
    },
    spaces($http, chrome, spacesEnabled) {
      if (spacesEnabled) {
        return new SpacesManager($http, chrome).getSpaces();
      }
      return [];
    }
  },
  controllerAs: 'editRole',
  controller($injector, $scope, $http, enableSpaceAwarePrivileges) {
    const $route = $injector.get('$route');
    const Private = $injector.get('Private');

    const role = $route.current.locals.role;

    const xpackInfo = Private(XPackInfoProvider);
    const userProfile = Private(UserProfileProvider);
    const allowDocumentLevelSecurity = xpackInfo.get('features.security.allowRoleDocumentLevelSecurity');
    const allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');
    const rbacApplication = chrome.getInjected('rbacApplication');

    if (role.elasticsearch.indices.length === 0) {
      const emptyOption = {
        names: [],
        privileges: []
      };

      if (allowFieldLevelSecurity) {
        emptyOption.field_security = {
          grant: ['*']
        };
      }

      if (allowDocumentLevelSecurity) {
        emptyOption.query = '';
      }

      role.elasticsearch.indices.push(emptyOption);
    }

    const {
      users,
      indexPatterns,
      spaces,
    } = $route.current.locals;

    $scope.$$postDigest(() => {
      const domNode = document.getElementById('editRoleReactRoot');

      render(
        <I18nContext>
          <EditRolePage
            runAsUsers={users}
            role={role}
            kibanaAppPrivileges={KibanaAppPrivileges}
            indexPatterns={indexPatterns}
            rbacEnabled={true}
            rbacApplication={rbacApplication}
            httpClient={$http}
            allowDocumentLevelSecurity={allowDocumentLevelSecurity}
            allowFieldLevelSecurity={allowFieldLevelSecurity}
            spaces={spaces}
            spacesEnabled={enableSpaceAwarePrivileges}
            userProfile={userProfile}
          />
        </I18nContext>, domNode);

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    });
  }
});
