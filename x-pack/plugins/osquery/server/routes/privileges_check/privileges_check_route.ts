/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const privilegesCheckRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/privileges_check',
      validate: {},
    },
    async (context, request, response) => {
      // this is to skip validation eg. for analysts in cases attachments so they can see the results despite not having permissions
      const { isSystemRequest } = request;
      if (!isSystemRequest) {
        const [coreStartServices] = await osqueryContext.getStartServices();
        const { osquery } = await coreStartServices.capabilities.resolveCapabilities(request);
        const isInvalid = !osquery.readLiveQueries;

        if (isInvalid) {
          return response.forbidden();
        }
      }

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
