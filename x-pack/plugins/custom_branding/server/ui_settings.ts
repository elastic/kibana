/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import type { DocLinksServiceSetup, UiSettingsParams } from '@kbn/core/server';

export const getUiSettings: () => Record<string, UiSettingsParams> = (
  docLinks: DocLinksServiceSetup
) => ({
  'customBranding:logo': {
    name: i18n.translate('customBranding.advancedSettings.logoTitle', {
      defaultMessage: 'Custom Logo',
    }),
    value: '',
    description: i18n.translate('customBranding.advancedSettings.logoText', {
      defaultMessage: 'Override of the default Elastic logo.',
    }),
    category: ['customBranding'],
    schema: schema.string(),
  },
  'customBranding:customizedLogo': {
    name: i18n.translate('customBranding.advancedSettings.customizedLogoTitle', {
      defaultMessage: 'Customized Logo',
    }),
    value: '',
    description: i18n.translate('customBranding.advancedSettings.customizedLogoText', {
      defaultMessage: 'Override of the Elastic text.',
    }),
    category: ['customBranding'],
    schema: schema.string(),
  },
});
