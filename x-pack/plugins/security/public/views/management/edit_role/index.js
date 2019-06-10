/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import routes from 'ui/routes';
import { capabilities } from 'ui/capabilities';
import { kfetch } from 'ui/kfetch';
import { fatalError } from 'ui/notify';
import template from 'plugins/security/views/management/edit_role/edit_role.html';
import 'ui/angular_ui_select';
import 'plugins/security/services/application_privilege';
import 'plugins/security/services/shield_user';
import 'plugins/security/services/shield_role';
import 'plugins/security/services/shield_indices';

import { IndexPatternsProvider } from 'ui/index_patterns/index_patterns';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { SpacesManager } from '../../../../../spaces/public/lib';
import { checkLicenseError } from 'plugins/security/lib/check_license_error';
import { EDIT_ROLES_PATH, ROLES_PATH } from '../management_urls';
import { getEditRoleBreadcrumbs, getCreateRoleBreadcrumbs } from '../breadcrumbs';

import { EditRolePage } from './components';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
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
          kibana: [],
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
    },
    privileges() {
      return kfetch({ method: 'get', pathname: '/api/security/privileges', query: { includeActions: true } });
    },
    features() {
      return kfetch({ method: 'get', pathname: '/api/features/v1' }).catch(e => {
        // TODO: This check can be removed once all of these `resolve` entries are moved out of Angular and into the React app.
        const unauthorizedForFeatures = _.get(e, 'body.statusCode') === 404;
        if (unauthorizedForFeatures) {
          return [];
        }
        throw e;
      });
    }
  },
  controllerAs: 'editRole',
  controller($injector, $scope, $http, enableSpaceAwarePrivileges) {
    const $route = $injector.get('$route');
    const Private = $injector.get('Private');

    const role = $route.current.locals.role;

    const xpackInfo = Private(XPackInfoProvider);
    const allowDocumentLevelSecurity = xpackInfo.get('features.security.allowRoleDocumentLevelSecurity');
    const allowFieldLevelSecurity = xpackInfo.get('features.security.allowRoleFieldLevelSecurity');

    if (role.elasticsearch.indices.length === 0) {
      const emptyOption = {
        names: [],
        privileges: []
      };

      if (allowFieldLevelSecurity) {
        emptyOption.field_security = {
          grant: ['*'],
          except: [],
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
      privileges,
      features,
    } = $route.current.locals;

    $scope.$$postDigest(async () => {
      const domNode = document.getElementById('editRoleReactRoot');

      render(
        <I18nContext>
          <EditRolePage
            runAsUsers={users}
            role={role}
            indexPatterns={indexPatterns}
            httpClient={$http}
            allowDocumentLevelSecurity={allowDocumentLevelSecurity}
            allowFieldLevelSecurity={allowFieldLevelSecurity}
            spaces={spaces}
            spacesEnabled={enableSpaceAwarePrivileges}
            uiCapabilities={capabilities.get()}
            features={features}
            privileges={privileges}
          />
        </I18nContext>, domNode);

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    });
  }
});
