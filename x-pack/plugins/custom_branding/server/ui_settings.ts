/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core-lifecycle-server';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

export const UI_SETTINGS_CUSTOM_LOGO = 'xpackCustomBranding:logo';
export const UI_SETTINGS_CUSTOMIZED_LOGO = 'xpackCustomBranding:customizedLogo';
export const UI_SETTINGS_PAGE_TITLE = 'xpackCustomBranding:pageTitle';
export const UI_SETTINGS_FAVICON_PNG = 'xpackCustomBranding:faviconPNG';
export const UI_SETTINGS_FAVICON_SVG = 'xpackCustomBranding:faviconSVG';
export const PLUGIN_ID = 'custom Branding';

const kbToBase64Length = (kb: number) => Math.floor((kb * 1024 * 8) / 6);
const maxLogoSizeInBase64 = kbToBase64Length(200);
const dataurlRegex = /^data:([a-z]+\/[a-z0-9-+.]+)(;[a-z-]+=[a-z0-9-]+)?(;([a-z0-9]+))?,/;
const imageTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];

const isImageData = (str: string) => {
  const matches = str.match(dataurlRegex);

  if (!matches) {
    return false;
  }

  const [, mimetype, , , encoding] = matches;
  const imageTypeIndex = imageTypes.indexOf(mimetype);
  if (imageTypeIndex < 0 || encoding !== 'base64') {
    return false;
  }

  return true;
};
const validateLogoBase64String = (str: string) => {
  if (typeof str !== 'string' || !isImageData(str)) {
    return i18n.translate('xpack.customBranding.uiSettings.validate.customLogo.badFile', {
      defaultMessage: `Sorry, that file will not work. Please try a different image file.`,
    });
  }
  if (str.length > maxLogoSizeInBase64) {
    return i18n.translate('xpack.customBranding.uiSettings.validate.customLogo.tooLarge', {
      defaultMessage: `Sorry, that file is too large. The image file must be less than 200 kilobytes.`,
    });
  }
};

export const ImageSchema = schema.nullable(schema.string({ validate: validateLogoBase64String }));

const subscriptionLink = `
      <a href="https://www.elastic.co/subscriptions" target="_blank" rel="noopener noreferrer">
        ${i18n.translate('xpack.customBranding.settings.subscriptionRequiredLink.text', {
          defaultMessage: 'Subscription required.',
        })}
      </a>
  `;
export function registerUiSettings(core: CoreSetup<object, unknown>) {
  core.uiSettings.registerGlobal({
    [UI_SETTINGS_CUSTOM_LOGO]: {
      name: i18n.translate('xpack.customBranding.customLogoLabel', {
        defaultMessage: 'Custom logo',
      }),
      value: null,
      description: i18n.translate('xpack.customBranding.customLogoDescription', {
        defaultMessage: `Customize Elastic with your organization's logo.  {subscriptionLink}`,
        values: { subscriptionLink },
      }),
      sensitive: true,
      type: 'image',
      order: 1,
      requiresPageReload: true,
      schema: ImageSchema,
      category: [PLUGIN_ID],
    },
    [UI_SETTINGS_CUSTOMIZED_LOGO]: {
      name: i18n.translate('xpack.customBranding.customizedLogoLabel', {
        defaultMessage: 'Custom logo text',
      }),
      value: null,
      description: i18n.translate('xpack.customBranding.customizedLogoDescription', {
        defaultMessage: `Customize Elastic text with your organization's name.  {subscriptionLink}`,
        values: { subscriptionLink },
      }),
      sensitive: true,
      type: 'image',
      order: 2,
      requiresPageReload: true,
      schema: ImageSchema,
      category: [PLUGIN_ID],
    },
    [UI_SETTINGS_PAGE_TITLE]: {
      name: i18n.translate('xpack.customBranding.pageTitleLabel', {
        defaultMessage: 'Document title',
      }),
      value: null,
      description: i18n.translate('xpack.customBranding.pageTitleDescription', {
        defaultMessage: `Add a custom document title to append to your browser window / tab.  {subscriptionLink}`,
        values: { subscriptionLink },
      }),
      sensitive: true,
      type: 'string',
      order: 3,
      requiresPageReload: true,
      schema: schema.nullable(schema.string()),
      category: [PLUGIN_ID],
    },
    [UI_SETTINGS_FAVICON_SVG]: {
      name: i18n.translate('xpack.customBranding.faviconSVGTitle', {
        defaultMessage: 'Favicon (SVG)',
      }),
      value: null,
      description: i18n.translate('xpack.customBranding.faviconSVGDescription', {
        defaultMessage: `Link to a favicon in SVG format.  {subscriptionLink}`,
        values: { subscriptionLink },
      }),
      sensitive: true,
      type: 'string',
      order: 4,
      requiresPageReload: true,
      schema: schema.nullable(schema.string()),
      category: [PLUGIN_ID],
    },
    [UI_SETTINGS_FAVICON_PNG]: {
      name: i18n.translate('xpack.customBranding.faviconPNGTitle', {
        defaultMessage: 'Favicon (PNG)',
      }),
      value: null,
      description: i18n.translate('xpack.customBranding.faviconPNGDescription', {
        defaultMessage: `Link to a favicon in PNG format. Used as a fallback for browsers that do not support SVG format.  {subscriptionLink}`,
        values: { subscriptionLink },
      }),
      sensitive: true,
      type: 'string',
      order: 5,
      requiresPageReload: true,
      schema: schema.nullable(schema.string()),
      category: [PLUGIN_ID],
    },
  } as Record<string, UiSettingsParams<null>>);
}
