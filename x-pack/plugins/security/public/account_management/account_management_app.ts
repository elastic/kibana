/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationSetup, AppMountParameters, StartServicesAccessor } from 'src/core/public';

import { AppNavLinkStatus } from '../../../../../src/core/public';
import type { AuthenticationServiceSetup } from '../authentication';

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
      navLinkStatus: AppNavLinkStatus.hidden,
      appRoute: '/security/account',
      async mount({ element, theme$ }: AppMountParameters) {
        const [[coreStart], { renderAccountManagementPage }, { UserAPIClient }] = await Promise.all(
          [getStartServices(), import('./account_management_page'), import('../management')]
        );

        coreStart.chrome.setBreadcrumbs([{ text: title }]);

        return renderAccountManagementPage(
          coreStart.i18n,
          { element, theme$ },
          {
            authc,
            notifications: coreStart.notifications,
            userAPIClient: new UserAPIClient(coreStart.http),
          }
        );
      },
    });
  },
});
