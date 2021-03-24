/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ApplicationSetup,
  AppMountParameters,
  HttpSetup,
  StartServicesAccessor,
} from 'src/core/public';

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  getStartServices: StartServicesAccessor;
}

export const unauthorizedApp = Object.freeze({
  id: 'security_unauthorized',
  create({ application, http, getStartServices }: CreateDeps) {
    http.anonymousPaths.register('/security/unauthorized');
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.unauthorizedAppTitle', {
        defaultMessage: 'Unauthorized',
      }),
      chromeless: true,
      appRoute: '/security/unauthorized',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderUnauthorizedPage }] = await Promise.all([
          getStartServices(),
          import('./unauthorized_page'),
        ]);
        return renderUnauthorizedPage(coreStart.i18n, element, {
          basePath: coreStart.http.basePath,
        });
      },
    });
  },
});
