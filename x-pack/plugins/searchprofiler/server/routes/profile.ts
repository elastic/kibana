/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import cloneDeep from 'lodash.clonedeep';
import { RouteDependencies } from '../types';

export const register = ({ router, getLicenseStatus }: RouteDependencies) => {
  router.post(
    {
      path: '/api/searchprofiler/profile',
      validate: {
        body: schema.object({
          query: schema.object({}, { allowUnknowns: true }),
          index: schema.string(),
          type: schema.string({ defaultValue: '' }),
        }),
      },
    },
    async (ctx, request, response) => {
      const currentLicenseStatus = getLicenseStatus();
      if (!currentLicenseStatus.valid) {
        return response.forbidden({
          body: {
            message: currentLicenseStatus.message ?? '',
          },
        });
      }

      const {
        core: { elasticsearch },
      } = ctx;

      let parsed = cloneDeep(request.body.query);
      parsed.profile = true;
      parsed = JSON.stringify(parsed, null, 2);

      const body = {
        index: request.body.index,
        body: parsed,
      };
      try {
        const resp = await elasticsearch.dataClient.callAsCurrentUser('search', body);
        return response.ok({
          body: {
            ok: true,
            resp,
          },
        });
      } catch (err) {
        return response.internalError({ body: err });
      }
    }
  );
};
