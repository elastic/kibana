/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsServiceSetup } from 'src/core/server';
import { BannerConfiguration } from '../common';
import { isHexColor } from './utils';

export const registerSettings = (
  uiSettings: UiSettingsServiceSetup,
  config: BannerConfiguration
) => {
  uiSettings.register({
    'banners:placement': {
      name: i18n.translate('xpack.banners.settings.placement.title', {
        defaultMessage: 'Banner placement',
      }),
      category: ['banner'],
      order: 1,
      type: 'select',
      value: config.placement,
      options: ['disabled', 'header'],
      optionLabels: {},
      requiresPageReload: true,
      schema: schema.oneOf([schema.literal('disabled'), schema.literal('header')]),
    },
    'banners:textContent': {
      name: i18n.translate('xpack.banners.settings.textContent.title', {
        defaultMessage: 'Banner text',
      }),
      sensitive: true,
      category: ['banner'],
      order: 2,
      type: 'markdown',
      value: config.textContent,
      requiresPageReload: true,
      schema: schema.string(),
    },
    'banners:textColor': {
      name: i18n.translate('xpack.banners.settings.textColor.title', {
        defaultMessage: 'Banner text color',
      }),
      category: ['banner'],
      order: 3,
      type: 'color',
      value: config.textColor,
      requiresPageReload: true,
      schema: schema.string({
        validate: (color) => {
          if (!isHexColor(color)) {
            return `'banners:textColor' must be an hex color`;
          }
        },
      }),
    },
    'banners:backgroundColor': {
      name: i18n.translate('xpack.banners.settings.backgroundColor.title', {
        defaultMessage: 'Banner background color',
      }),
      category: ['banner'],
      order: 4,
      type: 'color',
      value: config.backgroundColor,
      requiresPageReload: true,
      schema: schema.string({
        validate: (color) => {
          if (!isHexColor(color)) {
            return `'banners:backgroundColor' must be an hex color`;
          }
        },
      }),
    },
  });
};
