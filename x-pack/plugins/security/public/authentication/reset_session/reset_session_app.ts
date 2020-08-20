/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ApplicationSetup, AppMountParameters, StartServicesAccessor } from 'src/core/public';

interface CreateDeps {
  application: ApplicationSetup;
  getStartServices: StartServicesAccessor;
}

export const resetSessionApp = Object.freeze({
  id: 'security_reset_session',
  create({ application, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.resetSessionAppTitle', {
        defaultMessage: 'Reset Session',
      }),
      chromeless: true,
      appRoute: '/security/reset_session',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderResetSessionPage }] = await Promise.all([
          getStartServices(),
          import('./reset_session_page'),
        ]);
        return renderResetSessionPage(coreStart.i18n, element, {
          basePath: coreStart.http.basePath,
        });
      },
    });
  },
});
