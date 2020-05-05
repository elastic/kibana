/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { StartServicesAccessor, ApplicationSetup, AppMountParameters } from 'src/core/public';
import { AuthenticationServiceSetup } from '../authentication';

interface CreateDeps {
  application: ApplicationSetup;
  authc: AuthenticationServiceSetup;
  getStartServices: StartServicesAccessor;
}

export const accountManagementApp = Object.freeze({
  id: 'security_account',
  create({ application, authc, getStartServices }: CreateDeps) {
    const title = i18n.translate('xpack.security.account.breadcrumb', {
      defaultMessage: 'Account Management',
    });
    application.register({
      id: this.id,
      title,
      // TODO: switch to proper enum once https://github.com/elastic/kibana/issues/58327 is resolved.
      navLinkStatus: 3,
      appRoute: '/security/account',
      async mount({ element }: AppMountParameters) {
        const [
          [coreStart],
          { renderAccountManagementPage },
          { UserAPIClient },
        ] = await Promise.all([
          getStartServices(),
          import('./account_management_page'),
          import('../management'),
        ]);

        coreStart.chrome.setBreadcrumbs([{ text: title }]);

        return renderAccountManagementPage(coreStart.i18n, element, {
          authc,
          notifications: coreStart.notifications,
          userAPIClient: new UserAPIClient(coreStart.http),
        });
      },
    });
  },
});
