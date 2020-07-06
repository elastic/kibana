/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { deserializeDataStream, deserializeDataStreamList } from '../../../../common/lib';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerGetAllRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/data_streams'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      try {
        const dataStreams = await callAsCurrentUser('dataManagement.getDataStreams');
        const body = deserializeDataStreamList(dataStreams);

        return res.ok({ body });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
}

export function registerGetOneRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });

  router.get(
    {
      path: addBasePath('/data_streams/{name}'),
      validate: { params: paramsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { name } = req.params as TypeOf<typeof paramsSchema>;
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      try {
        const dataStream = await callAsCurrentUser('dataManagement.getDataStream', { name });

        if (dataStream[0]) {
          const body = deserializeDataStream(dataStream[0]);
          return res.ok({ body });
        }

        return res.notFound();
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );
}
