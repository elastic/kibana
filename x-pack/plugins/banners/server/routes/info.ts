/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '../../../licensing/server';
import { BannerInfoResponse } from '../../common';
import { BannersRouter } from '../types';

export const registerInfoRoute = (router: BannersRouter) => {
  router.get(
    {
      path: '/api/banners/info',
      validate: false,
      options: {
        authRequired: false,
      },
    },
    (ctx, req, res) => {
      const allowed = isValidLicense(ctx.licensing.license);

      return res.ok({
        body: {
          allowed,
        } as BannerInfoResponse,
      });
    }
  );
};

const isValidLicense = (license: ILicense): boolean => {
  return license.hasAtLeast('gold');
};
