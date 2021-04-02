/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../../src/core/server';

import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';

export const createPackRoute = (router: IRouter) => {
  router.post(
    {
      path: '/internal/osquery/pack',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      // @ts-expect-error update types
      const { name, description, queries } = request.body;

      // @ts-expect-error update types
      const references = queries.map((savedQuery) => ({
        type: savedQuerySavedObjectType,
        id: savedQuery.id,
        name: savedQuery.name,
      }));

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { attributes, references: _, ...restSO } = await savedObjectsClient.create(
        packSavedObjectType,
        {
          name,
          description,
          // @ts-expect-error update types
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          queries: queries.map(({ id, query, ...rest }) => rest),
        },
        {
          references,
        }
      );

      return response.ok({
        body: {
          ...restSO,
          ...attributes,
          queries,
        },
      });
    }
  );
};
