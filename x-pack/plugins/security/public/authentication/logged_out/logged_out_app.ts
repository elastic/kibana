/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  StartServicesAccessor,
  ApplicationSetup,
  AppMountParameters,
  HttpSetup,
} from 'src/core/public';

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
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderLoggedOutPage }] = await Promise.all([
          getStartServices(),
          import('./logged_out_page'),
        ]);
        return renderLoggedOutPage(coreStart.i18n, element, { basePath: coreStart.http.basePath });
      },
    });
  },
});
