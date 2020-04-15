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

export const accessNoticeApp = Object.freeze({
  id: 'security_access_notice',
  create({ application, getStartServices }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.accessNoticeAppTitle', {
        defaultMessage: 'Access Notice',
      }),
      chromeless: true,
      appRoute: '/security/access_notice',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderAccessNoticePage }] = await Promise.all([
          getStartServices(),
          import('./access_notice_page'),
        ]);
        return renderAccessNoticePage(coreStart.i18n, element, {
          http: coreStart.http,
          notifications: coreStart.notifications,
          fatalErrors: coreStart.fatalErrors,
        });
      },
    });
  },
});
