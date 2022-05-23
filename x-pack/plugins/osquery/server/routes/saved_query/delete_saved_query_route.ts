/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { find } from 'lodash';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const deleteSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.delete(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;

      const installation = await osqueryContext.service
        .getPackageService()
        ?.asInternalUser?.getInstallation(OSQUERY_INTEGRATION_NAME);

      if (installation) {
        const installationSavedQueries = find(
          installation.installed_kibana,
          (item) => item.type === savedQuerySavedObjectType && item.id === request.params.id
        );
        if (installationSavedQueries) {
          return response.conflict({ body: `Elastic prebuilt Saved query cannot be deleted.` });
        }
      }

      await savedObjectsClient.delete(savedQuerySavedObjectType, request.params.id, {
        refresh: 'wait_for',
      });

      return response.ok({
        body: {},
      });
    }
  );
};
