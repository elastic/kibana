/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ES_PIT_ROUTE_PATH } from '../../../common/constants';
import type { CspAppContext } from '../../plugin';
import type { CspRouter } from '../../types';

export const DEFAULT_PIT_KEEP_ALIVE = '1m';

export const esPitInputSchema = schema.object({
  index_name: schema.string(),
  keep_alive: schema.string({ defaultValue: DEFAULT_PIT_KEEP_ALIVE }),
});

export const defineEsPitRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.post(
    {
      path: ES_PIT_ROUTE_PATH,
      validate: { query: esPitInputSchema },
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, request, response) => {
      if (!(await context.fleet).authz.fleet.all) {
        return response.forbidden();
      }

      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;
        const { id } = await esClient.openPointInTime({
          index: request.query.index_name,
          keep_alive: request.query.keep_alive,
        });

        return response.ok({ body: id });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Failed to open Elasticsearch point in time: ${error}`);
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
