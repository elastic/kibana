/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationSetup,
  AppMountParameters,
  HttpSetup,
  StartServicesAccessor,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { ConfigType } from '../../config';

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  getStartServices: StartServicesAccessor;
  config: Pick<ConfigType, 'loginAssistanceMessage' | 'sameSiteCookies'>;
}

export const loginApp = Object.freeze({
  id: 'security_login',
  create({ application, http, getStartServices, config }: CreateDeps) {
    http.anonymousPaths.register('/login');
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.loginAppTitle', { defaultMessage: 'Login' }),
      chromeless: true,
      appRoute: '/login',
      async mount({ element, theme$ }: AppMountParameters) {
        const [[coreStart], { renderLoginPage }] = await Promise.all([
          getStartServices(),
          import('./login_page'),
        ]);
        return renderLoginPage(
          coreStart.i18n,
          { element, theme$ },
          {
            http: coreStart.http,
            notifications: coreStart.notifications,
            fatalErrors: coreStart.fatalErrors,
            loginAssistanceMessage: config.loginAssistanceMessage,
            sameSiteCookies: config.sameSiteCookies,
          }
        );
      },
    });
  },
});
