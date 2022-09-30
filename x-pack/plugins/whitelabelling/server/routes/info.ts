/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/server';
import { WhitelabellingInfoResponse } from '../../common';
import { WhitelabellingRouter } from '../types';
import { ConfigSchema } from '../../config';

export const registerInfoRoute = (router: WhitelabellingRouter, config: ConfigSchema) => {
  router.get(
    {
      path: '/api/whitelabelling/info',
      validate: false,
      options: {
        authRequired: 'optional',
      },
    },
    async (ctx, req, res) => {
      const allowed = isValidLicense((await ctx.licensing).license);

      if (!req.auth.isAuthenticated) {
        return res.forbidden();
      }

      return res.ok({
        body: {
          allowed,
          theming: config.theme,
        } as WhitelabellingInfoResponse,
      });
    }
  );
};

const isValidLicense = (license: ILicense): boolean => {
  return license.hasAtLeast('enterprise');
};
