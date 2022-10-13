/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { isSavedQueryPrebuilt } from './utils';

export const deleteSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.delete(
    {
      path: '/api/osquery/saved_queries/{id}',
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

      const isPrebuilt = await isSavedQueryPrebuilt(
        osqueryContext.service.getPackageService()?.asInternalUser,
        request.params.id
      );
      if (isPrebuilt) {
        return response.conflict({ body: `Elastic prebuilt Saved query cannot be deleted.` });
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
