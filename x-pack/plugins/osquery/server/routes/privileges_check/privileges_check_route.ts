/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const privilegesCheckRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/privileges_check',
      validate: {},
      options: {
        tags: [`access:${PLUGIN_ID}-readLiveQueries`],
      },
    },
    async (context, request, response) => {
      if (osqueryContext.security.authz.mode.useRbacForRequest(request)) {
        const checkPrivileges =
          osqueryContext.security.authz.checkPrivilegesDynamicallyWithRequest(request);
        const { hasAllRequested } = await checkPrivileges({
          elasticsearch: {
            cluster: [],
            index: {
              [`logs-${OSQUERY_INTEGRATION_NAME}.result*`]: ['read'],
            },
          },
        });

        return response.ok({
          body: `${hasAllRequested}`,
        });
      }

      return response.ok({
        body: 'true',
      });
    }
  );
};
