/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerDeleteRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.post(
    {
      path: addBasePath('/delete'),
      validate: {
        body: schema.object({
          jobIds: schema.arrayOf(schema.string()),
        }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const { jobIds } = request.body;
        const data = await Promise.all(
          jobIds.map((id: string) =>
            context.rollup!.client.callAsCurrentUser('rollup.deleteJob', { id })
          )
        ).then(() => ({ success: true }));
        return response.ok({ body: data });
      } catch (err) {
        // There is an issue opened on ES to handle the following error correctly
        // https://github.com/elastic/elasticsearch/issues/42908
        // Until then we'll modify the response here.
        if (err.response && err.response.includes('Job must be [STOPPED] before deletion')) {
          err.status = 400;
          err.statusCode = 400;
          err.displayName = 'Bad request';
          err.message = JSON.parse(err.response).task_failures[0].reason.reason;
        }
        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }
        return response.internalError({ body: err });
      }
    })
  );
};
