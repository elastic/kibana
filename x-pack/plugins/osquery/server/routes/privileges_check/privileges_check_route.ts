/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const esClient = context.core.elasticsearch.client.asCurrentUser;

      const privileges = (
        await esClient.security.hasPrivileges({
          body: {
            index: [
              {
                names: [`logs-${OSQUERY_INTEGRATION_NAME}.result*`],
                privileges: ['read'],
              },
            ],
          },
        })
      ).body;

      return response.ok({
        body: privileges,
      });
    }
  );
};
