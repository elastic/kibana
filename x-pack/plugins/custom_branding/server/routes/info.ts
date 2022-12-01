/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/server';
import { CustomBrandingInfoResponse } from '../../common/types';
import { CustomBrandingRouter } from '../types';

export const registerInfoRoute = (router: CustomBrandingRouter) => {
  router.get(
    {
      path: '/api/custom_branding/info',
      validate: false,
      options: {
        authRequired: 'optional',
      },
    },
    async (ctx, req, res) => {
      const allowed = isValidLicense((await ctx.licensing).license);

      if (!allowed) {
        return res.forbidden();
      }

      return res.ok({
        body: {
          allowed,
        } as CustomBrandingInfoResponse,
      });
    }
  );
};

const isValidLicense = (license: ILicense): boolean => {
  return license.hasAtLeast('enterprise');
};
