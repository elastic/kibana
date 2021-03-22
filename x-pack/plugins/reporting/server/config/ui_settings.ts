/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CoreSetup, UiSettingsParams } from 'kibana/server';
import { PLUGIN_ID, UI_SETTINGS_CUSTOM_PDF_LOGO } from '../../common/constants';

const kbToBase64Length = (kb: number) => Math.floor((kb * 1024 * 8) / 6);
const maxLogoSizeInKilobytes = kbToBase64Length(200);

// inspired by x-pack/plugins/canvas/common/lib/dataurl.ts
const dataurlRegex = /^data:([a-z]+\/[a-z0-9-+.]+)(;[a-z-]+=[a-z0-9-]+)?(;([a-z0-9]+))?,/;
const imageTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];

const isImageData = (str: any): boolean => {
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

const isLessThanMaxSize = (str: any) => {
  if (str.length > maxLogoSizeInKilobytes) {
    return false;
  }

  return true;
};

const validatePdfLogoBase64String = (str: any) => {
  if (typeof str !== 'string' || !isImageData(str)) {
    return i18n.translate('xpack.reporting.uiSettings.validate.customLogo.badFile', {
      defaultMessage: `Sorry, that file will not work. Please try a different image file.`,
    });
  }
  if (!isLessThanMaxSize(str)) {
    return i18n.translate('xpack.reporting.uiSettings.validate.customLogo.tooLarge', {
      defaultMessage: `Sorry, that file is too large. The image file must be less than 200 kilobytes.`,
    });
  }
};

export const PdfLogoSchema = schema.nullable(schema.any({ validate: validatePdfLogoBase64String }));

export function registerUiSettings(core: CoreSetup<object, unknown>) {
  core.uiSettings.register({
    [UI_SETTINGS_CUSTOM_PDF_LOGO]: {
      name: i18n.translate('xpack.reporting.pdfFooterImageLabel', {
        defaultMessage: 'PDF footer image',
      }),
      value: null,
      description: i18n.translate('xpack.reporting.pdfFooterImageDescription', {
        defaultMessage: `Custom image to use in the PDF's footer`,
      }),
      sensitive: true,
      type: 'image',
      schema: PdfLogoSchema,
      category: [PLUGIN_ID],
      validation: {
        maxSize: {
          length: maxLogoSizeInKilobytes,
          description: '200 kB',
        },
      },
    },
  } as Record<string, UiSettingsParams<null>>);
}
