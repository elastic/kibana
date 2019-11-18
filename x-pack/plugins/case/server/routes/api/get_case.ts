/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';

export function initGetCaseApi(deps: RouteDeps) {
  const { router } = deps;

  router.get(
    {
      path: '/api/cases/case/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      // const spaceId = request.params.id;

      // const { SavedObjectsClient } = getSavedObjects();
      // const spacesClient = await spacesService.scopedClient(request);
      const resp = await context.core.savedObjects.client.find({ type: 'CASE' });
      console.log('request.params', request.params);

      try {
        // const space = await spacesClient.get(spaceId);
        return response.ok({ body: { id: request.params.id } });
      } catch (error) {
        // if (SavedObjectsClient.errors.isNotFoundError(error)) {
        //   return response.notFound();
        // }
        return response.customError(error);
      }
    }
  );
}
