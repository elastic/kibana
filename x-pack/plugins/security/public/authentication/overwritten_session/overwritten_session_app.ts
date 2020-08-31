/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { StartServicesAccessor, ApplicationSetup, AppMountParameters } from 'src/core/public';
import { AuthenticationServiceSetup } from '../authentication_service';

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
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderOverwrittenSessionPage }] = await Promise.all([
          getStartServices(),
          import('./overwritten_session_page'),
        ]);
        return renderOverwrittenSessionPage(coreStart.i18n, element, {
          authc,
          basePath: coreStart.http.basePath,
        });
      },
    });
  },
});
