/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from 'kibana/server';
import { ILicense } from '../../../licensing/server';
import { BannerInfoResponse, BannerConfiguration, BannerPlacement } from '../../common';
import { BannersRouter } from '../types';

export const registerInfoRoute = (router: BannersRouter, config: BannerConfiguration) => {
  router.get(
    {
      path: '/api/banners/info',
      validate: false,
      options: {
        authRequired: 'optional',
      },
    },
    async (ctx, req, res) => {
      const allowed = isValidLicense(ctx.licensing.license);

      const bannerConfig = req.auth.isAuthenticated
        ? await getBannerConfig(ctx.core.uiSettings.client)
        : config;

      return res.ok({
        body: {
          allowed,
          banner: bannerConfig,
        } as BannerInfoResponse,
      });
    }
  );
};

const isValidLicense = (license: ILicense): boolean => {
  return license.hasAtLeast('gold');
};

const getBannerConfig = async (client: IUiSettingsClient): Promise<BannerConfiguration> => {
  const [placement, textContent, textColor, backgroundColor] = await Promise.all([
    client.get<BannerPlacement>('banner:placement'),
    client.get<string>('banner:textContent'),
    client.get<string>('banner:textColor'),
    client.get<string>('banner:backgroundColor'),
  ]);

  return {
    placement,
    textContent,
    textColor,
    backgroundColor,
  };
};
