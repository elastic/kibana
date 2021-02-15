/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType } from '../../../common/types';

export const deletePackRoute = (router: IRouter) => {
  router.delete(
    {
      path: '/internal/osquery/pack',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      // @ts-expect-error update types
      const { packIds } = request.body;

      await Promise.all(
        packIds.map(
          // @ts-expect-error update types
          async (packId) =>
            await savedObjectsClient.delete(packSavedObjectType, packId, {
              refresh: 'wait_for',
            })
        )
      );

      return response.ok({
        body: packIds,
      });
    }
  );
};
