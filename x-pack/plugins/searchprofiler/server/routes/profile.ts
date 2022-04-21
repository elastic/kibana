/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../types';

export const register = ({ router, getLicenseStatus, log }: RouteDependencies) => {
  router.post(
    {
      path: '/api/searchprofiler/profile',
      validate: {
        body: schema.object({
          query: schema.object({}, { unknowns: 'allow' }),
          index: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      const currentLicenseStatus = getLicenseStatus();
      if (!currentLicenseStatus.valid) {
        return response.forbidden({
          body: {
            message: currentLicenseStatus.message!,
          },
        });
      }

      const {
        body: { query, index },
      } = request;

      const body = {
        index,
        body: {
          // Activate profiler mode for this query.
          profile: true,
          ...query,
        },
      };

      try {
        const client = ctx.core.elasticsearch.client.asCurrentUser;
        const resp = await client.search(body);

        return response.ok({
          body: {
            ok: true,
            resp,
          },
        });
      } catch (err) {
        log.error(err);
        const { statusCode, body: errorBody } = err;

        return response.customError({
          statusCode: statusCode || 500,
          body: errorBody
            ? {
                message: errorBody.error?.reason,
                attributes: errorBody,
              }
            : err,
        });
      }
    }
  );
};
