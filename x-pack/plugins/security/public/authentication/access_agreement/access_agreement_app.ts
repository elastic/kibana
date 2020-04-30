/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { StartServicesAccessor, ApplicationSetup, AppMountParameters } from 'src/core/public';

interface CreateDeps {
  application: ApplicationSetup;
  getStartServices: StartServicesAccessor;
}

export const accessAgreementApp = Object.freeze({
  id: 'security_access_agreement',
  create({ application, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.accessAgreementAppTitle', {
        defaultMessage: 'Access Agreement',
      }),
      chromeless: true,
      appRoute: '/security/access_agreement',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderAccessAgreementPage }] = await Promise.all([
          getStartServices(),
          import('./access_agreement_page'),
        ]);
        return renderAccessAgreementPage(coreStart.i18n, element, {
          http: coreStart.http,
          notifications: coreStart.notifications,
          fatalErrors: coreStart.fatalErrors,
        });
      },
    });
  },
});
