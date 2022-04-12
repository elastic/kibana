/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from 'kibana/server';
import { ILicense } from '../../../licensing/server';
import { BannersConfigType } from '../config';
import { BannerInfoResponse, BannerConfiguration, BannerPlacement } from '../../common';
import { BannersRouter } from '../types';

export const registerInfoRoute = (router: BannersRouter, config: BannersConfigType) => {
  router.get(
    {
      path: '/api/banners/info',
      validate: false,
      options: {
        authRequired: 'optional',
      },
    },
    async (ctx, req, res) => {
      const allowed = isValidLicense((await ctx.licensing).license);

      const bannerConfig =
        req.auth.isAuthenticated && config.disableSpaceBanners === false
          ? await getBannerConfig((await ctx.core).uiSettings.client)
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
    client.get<BannerPlacement>('banners:placement'),
    client.get<string>('banners:textContent'),
    client.get<string>('banners:textColor'),
    client.get<string>('banners:backgroundColor'),
  ]);

  return {
    placement,
    textContent,
    textColor,
    backgroundColor,
  };
};
