/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../../src/core/server';
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
    },
    async (context, request, response) => {
      const [coreStartServices] = await osqueryContext.getStartServices();

      const {
        osquery: { writeSavedQueries },
      } = await coreStartServices.capabilities.resolveCapabilities(request);

      if (!writeSavedQueries) {
        return response.forbidden();
      }
      const savedObjectsClient = context.core.savedObjects.client;

      await savedObjectsClient.delete(savedQuerySavedObjectType, request.params.id, {
        refresh: 'wait_for',
      });

      return response.ok({
        body: {},
      });
    }
  );
};
