/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { serializeFollowerIndex } from '../../../../common/services/follower_index_serialization';
import { FollowerIndex } from '../../../../common/types';
import { addBasePath } from '../../../services';
import { removeEmptyFields } from '../../../../common/services/utils';
import { RouteDependencies } from '../../../types';

/**
 * Create a follower index
 */
export const registerCreateRoute = ({ router, license, lib }: RouteDependencies) => {
  const bodySchema = schema.object(
    {
      name: schema.string(),
    },
    { unknowns: 'allow' }
  );

  router.post(
    {
      path: addBasePath('/follower_indices'),
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { name, ...rest } = request.body as typeof bodySchema.type;
      const body = removeEmptyFields(serializeFollowerIndex(rest as FollowerIndex));

      try {
        return response.ok({
          body: await context.crossClusterReplication!.client.callAsCurrentUser(
            'ccr.saveFollowerIndex',
            { name, body }
          ),
        });
      } catch (err) {
        if (lib.isEsError(err)) {
          return response.customError({
            statusCode: err.statusCode,
            body: err,
          });
        }
        // Case: default
        return response.internalError({ body: err });
      }
    })
  );
};
