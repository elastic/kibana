/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';

export const updatePackRoute = (router: IRouter) => {
  router.put(
    {
      path: '/internal/osquery/pack/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      // @ts-expect-error update types
      const { name, description, queries } = request.body;

      // @ts-expect-error update types
      const updatedReferences = queries.map((savedQuery) => ({
        type: savedQuerySavedObjectType,
        id: savedQuery.id,
        name: savedQuery.name,
      }));

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { attributes, references, ...restSO } = await savedObjectsClient.update(
        packSavedObjectType,
        // @ts-expect-error update types
        request.params.id,
        {
          name,
          description,
          // @ts-expect-error update types
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          queries: queries.map(({ id, query, ...rest }) => rest),
        },
        {
          references: updatedReferences,
        }
      );

      return response.ok({
        body: {
          ...restSO,
          ...attributes,
          // @ts-expect-error update types
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          queries: queries.map(({ id, ...rest }) => rest),
        },
      });
    }
  );
};
