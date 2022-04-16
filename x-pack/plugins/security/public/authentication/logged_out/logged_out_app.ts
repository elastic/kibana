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

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  getStartServices: StartServicesAccessor;
}

export const loggedOutApp = Object.freeze({
  id: 'security_logged_out',
  create({ application, http, getStartServices }: CreateDeps) {
    http.anonymousPaths.register('/security/logged_out');
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.loggedOutAppTitle', { defaultMessage: 'Logged out' }),
      chromeless: true,
      appRoute: '/security/logged_out',
      async mount({ element, theme$ }: AppMountParameters) {
        const [[coreStart], { renderLoggedOutPage }] = await Promise.all([
          getStartServices(),
          import('./logged_out_page'),
        ]);
        return renderLoggedOutPage(
          coreStart.i18n,
          { element, theme$ },
          { basePath: coreStart.http.basePath }
        );
      },
    });
  },
});
