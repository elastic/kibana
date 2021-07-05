/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const createStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/status',
      validate: false,
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const isSuperUser = osqueryContext.security.authc
        .getCurrentUser(request)
        ?.roles.includes('superuser');

      if (!isSuperUser) {
        return response.ok({ body: undefined });
      }

      const packageInfo = await osqueryContext.service
        .getPackageService()
        ?.getInstallation({ savedObjectsClient: soClient, pkgName: OSQUERY_INTEGRATION_NAME });

      return response.ok({ body: packageInfo });
    }
  );
};
