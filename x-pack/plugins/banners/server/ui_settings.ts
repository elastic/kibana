/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsServiceSetup } from 'src/core/server';
import { isHexColor } from './utils';

// Note: unused for now, will be used for v2 (see https://github.com/elastic/kibana/issues/17298)

export const registerSettings = (uiSettings: UiSettingsServiceSetup) => {
  uiSettings.register({
    'banner:placement': {
      name: i18n.translate('xpack.banners.settings.placement.title', {
        defaultMessage: 'Banner placement',
      }),
      category: ['banner'],
      order: 1,
      type: 'select',
      value: 'disabled',
      options: ['disabled', 'header'],
      optionLabels: {},
      requiresPageReload: true,
      schema: schema.oneOf([schema.literal('disabled'), schema.literal('header')]),
    },
    'banner:textContent': {
      name: i18n.translate('xpack.banners.settings.textContent.title', {
        defaultMessage: 'Banner text',
      }),
      sensitive: true,
      category: ['banner'],
      order: 2,
      type: 'markdown',
      value: '',
      requiresPageReload: true,
      schema: schema.string(),
    },
    'banner:textColor': {
      name: i18n.translate('xpack.banners.settings.textColor.title', {
        defaultMessage: 'Banner text color',
      }),
      category: ['banner'],
      order: 3,
      type: 'color',
      value: '#000000',
      requiresPageReload: true,
      schema: schema.string({
        validate: (color) => {
          if (!isHexColor(color)) {
            return `'banner:textColor' must be an hex color`;
          }
        },
      }),
    },
    'banner:backgroundColor': {
      name: i18n.translate('xpack.banners.settings.backgroundColor.title', {
        defaultMessage: 'Banner background color',
      }),
      category: ['banner'],
      order: 4,
      type: 'color',
      value: '#FFFFFF',
      requiresPageReload: true,
      schema: schema.string({
        validate: (color) => {
          if (!isHexColor(color)) {
            return `'banner:backgroundColor' must be an hex color`;
          }
        },
      }),
    },
  });
};
