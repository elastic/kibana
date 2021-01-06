/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from 'src/core/server';
import { LicensingPluginStart } from '../../licensing/server';

export interface BannersPluginStartDeps {
  licensing: LicensingPluginStart;
}

export class BannersPlugin implements Plugin<{}, {}, {}, BannersPluginStartDeps> {
  setup({ uiSettings, getStartServices }: CoreSetup<{}, {}>) {
    uiSettings.register({
      'banner:placement': {
        name: i18n.translate('xpack.banners.settings.placement.title', {
          defaultMessage: 'Banner placement',
        }),
        description: i18n.translate('xpack.banners.settings.placement.desc', {
          defaultMessage: 'TODO',
        }),
        category: ['banner'],
        order: 1,
        type: 'select',
        value: 'disabled',
        options: ['disabled', 'header', 'footer', 'both'],
        optionLabels: {},
        requiresPageReload: true,
        schema: schema.oneOf([
          schema.literal('disabled'),
          schema.literal('header'),
          schema.literal('footer'),
          schema.literal('both'),
        ]),
      },
      'banner:textContent': {
        name: i18n.translate('xpack.banners.settings.textContent.title', {
          defaultMessage: 'Banner text',
        }),
        description: i18n.translate('xpack.banners.settings.textContent.desc', {
          defaultMessage: 'TODO',
        }),
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
        description: i18n.translate('xpack.banners.settings.textColor.desc', {
          defaultMessage: 'TODO',
        }),
        category: ['banner'],
        order: 3,
        type: 'color',
        value: '#000000',
        requiresPageReload: true,
        schema: schema.string(),
      },
      'banner:backgroundColor': {
        name: i18n.translate('xpack.banners.settings.backgroundColor.title', {
          defaultMessage: 'Banner background color',
        }),
        description: i18n.translate('xpack.banners.settings.backgroundColor.desc', {
          defaultMessage: 'TODO',
        }),
        category: ['banner'],
        order: 4,
        type: 'color',
        value: '#FFFFFF',
        requiresPageReload: true,
        schema: schema.string(),
      },
    });

    return {};
  }

  start() {
    return {};
  }
}
