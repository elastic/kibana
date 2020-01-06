/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, AppMountParameters } from 'src/core/public';
import { AuthenticationServiceSetup } from '../authentication';
import { UserAPIClient } from '../management';

interface CreateDeps {
  application: CoreSetup['application'];
  authc: AuthenticationServiceSetup;
  getStartServices: CoreSetup['getStartServices'];
}

export const accountManagementApp = Object.freeze({
  id: 'security',
  create({ application, authc, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.account.breadcrumb', {
        defaultMessage: 'Account Management',
      }),
      // TODO: switch to proper enum once https://github.com/elastic/kibana/issues/58327 is resolved.
      navLinkStatus: 3,
      appRoute: '/security/account',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderAccountManagementPage }] = await Promise.all([
          getStartServices(),
          import('./account_management_page'),
        ]);

        coreStart.chrome.setBreadcrumbs([
          {
            text: i18n.translate('xpack.security.account.breadcrumb', {
              defaultMessage: 'Account Management',
            }),
          },
        ]);

        return renderAccountManagementPage(coreStart.i18n, element, {
          authc,
          notifications: coreStart.notifications,
          apiClient: new UserAPIClient(coreStart.http),
        });
      },
    });
  },
});
