/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSetup, AppMountParameters, StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { AuthenticationServiceSetup } from '../authentication_service';

interface CreateDeps {
  application: ApplicationSetup;
  authc: Pick<AuthenticationServiceSetup, 'getCurrentUser'>;
  getStartServices: StartServicesAccessor;
}

export const overwrittenSessionApp = Object.freeze({
  id: 'security_overwritten_session',
  create({ application, authc, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.overwrittenSessionAppTitle', {
        defaultMessage: 'Overwritten Session',
      }),
      chromeless: true,
      appRoute: '/security/overwritten_session',
      async mount({ element, theme$ }: AppMountParameters) {
        const [[coreStart], { renderOverwrittenSessionPage }] = await Promise.all([
          getStartServices(),
          import('./overwritten_session_page'),
        ]);
        return renderOverwrittenSessionPage(
          coreStart.i18n,
          { element, theme$ },
          {
            authc,
            basePath: coreStart.http.basePath,
          }
        );
      },
    });
  },
});
