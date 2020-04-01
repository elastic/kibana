/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  StartServicesAccessor,
  AppMountParameters,
  ApplicationSetup,
  HttpSetup,
} from 'src/core/public';
import { ConfigType } from '../../config';

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  getStartServices: StartServicesAccessor;
  config: Pick<ConfigType, 'loginAssistanceMessage'>;
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
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderLoginPage }] = await Promise.all([
          getStartServices(),
          import('./login_page'),
        ]);
        return renderLoginPage(coreStart.i18n, element, {
          http: coreStart.http,
          notifications: coreStart.notifications,
          fatalErrors: coreStart.fatalErrors,
          loginAssistanceMessage: config.loginAssistanceMessage,
        });
      },
    });
  },
});
