/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsServiceSetup } from '@kbn/core/server';
import { BannersConfigType } from './config';
import { isHexColor } from './utils';

export const registerSettings = (uiSettings: UiSettingsServiceSetup, config: BannersConfigType) => {
  if (config.disableSpaceBanners) {
    return;
  }

  const subscriptionLink = `
      <a href="https://www.elastic.co/subscriptions" target="_blank" rel="noopener noreferrer">
        ${i18n.translate('xpack.banners.settings.subscriptionRequiredLink.text', {
          defaultMessage: 'Subscription required.',
        })}
      </a>
  `;

  uiSettings.register({
    'banners:placement': {
      name: i18n.translate('xpack.banners.settings.placement.title', {
        defaultMessage: 'Banner placement',
      }),
      description: i18n.translate('xpack.banners.settings.placement.description', {
        defaultMessage:
          'Display a top banner for this space, above the Elastic header. {subscriptionLink}',
        values: {
          subscriptionLink,
        },
      }),
      category: ['banner'],
      order: 1,
      type: 'select',
      value: config.placement,
      options: ['disabled', 'top'],
      optionLabels: {
        disabled: i18n.translate('xpack.banners.settings.placement.disabled', {
          defaultMessage: 'Disabled',
        }),
        top: i18n.translate('xpack.banners.settings.placement.top', {
          defaultMessage: 'Top',
        }),
      },
      requiresPageReload: true,
      schema: schema.oneOf([schema.literal('disabled'), schema.literal('top')]),
    },
    'banners:textContent': {
      name: i18n.translate('xpack.banners.settings.textContent.title', {
        defaultMessage: 'Banner text',
      }),
      description: i18n.translate('xpack.banners.settings.text.description', {
        defaultMessage: 'Add Markdown-formatted text to the banner. {subscriptionLink}',
        values: {
          subscriptionLink,
        },
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
      description: i18n.translate('xpack.banners.settings.textColor.description', {
        defaultMessage: 'Set the color of the banner text. {subscriptionLink}',
        values: {
          subscriptionLink,
        },
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
      description: i18n.translate('xpack.banners.settings.backgroundColor.description', {
        defaultMessage: 'Set the background color for the banner. {subscriptionLink}',
        values: {
          subscriptionLink,
        },
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
