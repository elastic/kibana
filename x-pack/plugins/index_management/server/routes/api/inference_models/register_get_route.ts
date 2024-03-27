/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';
import { addBasePath } from '..';
import { RouteDependencies } from '../../../types';

export function registerGetAllRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  // Get all inference models
  router.get(
    {
      path: addBasePath('/inference/all'),
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const { models } = await client.asCurrentUser.transport.request<{
          models: InferenceAPIConfigResponse[];
        }>({
          method: 'GET',
          path: `/_inference/_all`,
        });

        return response.ok({
          body: models,
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
