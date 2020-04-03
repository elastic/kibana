/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializePipelines } from '../../../common/lib';
import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';

export const registerGetRoutes = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  router.get(
    { path: API_BASE_PATH, validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;

      try {
        const pipelines = await callAsCurrentUser('ingest.getPipeline');

        return res.ok({ body: deserializePipelines(pipelines) });
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
};
