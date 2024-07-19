/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LANDING_TITLE = i18n.translate('xpack.integrationImport.landing.title', {
  defaultMessage: 'Create new integration',
});

export const LANDING_DESCRIPTION = i18n.translate('xpack.integrationImport.landing.description', {
  defaultMessage:
    'Start an AI-driven process to build your integration step-by-step, or upload a .zip package of a previously created integration',
});

export const PACKAGE_UPLOAD_TITLE = i18n.translate(
  'xpack.integrationImport.landing.packageUpload.title',
  {
    defaultMessage: 'Package upload',
  }
);

export const PACKAGE_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.integrationImport.landing.packageUpload.description',
  {
    defaultMessage: 'Use this option if you have an existing integration package in a .zip file',
  }
);

export const PACKAGE_UPLOAD_BUTTON = i18n.translate(
  'xpack.integrationImport.landing.packageUpload.button',
  {
    defaultMessage: 'Upload .zip',
  }
);

export const AUTO_IMPORT_TITLE = i18n.translate(
  'xpack.integrationImport.landing.autoImport.title',
  {
    defaultMessage: 'Create custom integration',
  }
);

export const AUTO_IMPORT_DESCRIPTION = i18n.translate(
  'xpack.integrationImport.landing.autoImport.description',
  {
    defaultMessage: 'Use our AI-driven process to build your custom integration',
  }
);

export const AUTO_IMPORT_BUTTON = i18n.translate(
  'xpack.integrationImport.landing.autoImport.button',
  {
    defaultMessage: 'Create Integration',
  }
);

export const TECH_PREVIEW = i18n.translate(
  'xpack.integrationImport.landing.autoImport.techPreviewBadge',
  {
    defaultMessage: 'Technical preview',
  }
);

export const TECH_PREVIEW_TOOLTIP = i18n.translate(
  'xpack.integrationImport.landing.autoImport.techPreviewTooltip',
  {
    defaultMessage:
      'This functionality is in technical preview and is subject to change. Please use with caution in production environments.',
  }
);
