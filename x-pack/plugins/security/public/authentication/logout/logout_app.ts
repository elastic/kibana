/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

interface CreateDeps {
  application: CoreSetup['application'];
  http: HttpSetup;
}

export const logoutApp = Object.freeze({
  id: 'security_logout',
  create({ application, http }: CreateDeps) {
    http.anonymousPaths.register('/logout');
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.logoutAppTitle', { defaultMessage: 'Logout' }),
      chromeless: true,
      appRoute: '/logout',
      async mount() {
        window.sessionStorage.clear();

        // Redirect user to the server logout endpoint to complete logout.
        window.location.href = http.basePath.prepend(
          `/api/security/logout${window.location.search}`
        );

        return () => {};
      },
    });
  },
});
