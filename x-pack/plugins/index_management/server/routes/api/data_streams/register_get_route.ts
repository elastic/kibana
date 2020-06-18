/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeDataStreamList } from '../../../../common/lib';
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
