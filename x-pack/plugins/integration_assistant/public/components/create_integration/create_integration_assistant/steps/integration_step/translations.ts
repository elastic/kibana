/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.integrationAssistant.step.integration.title', {
  defaultMessage: 'Integration details',
});
export const DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.integration.description',
  {
    defaultMessage:
      'Fill out the form in the UI to name your integration and provide a brief description',
  }
);

export const TITLE_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.integration.integrationTitle',
  {
    defaultMessage: 'Title',
  }
);
export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.integration.integrationDescription',
  {
    defaultMessage: 'Description',
  }
);
export const LOGO_LABEL = i18n.translate('xpack.integrationAssistant.step.integration.logo.label', {
  defaultMessage: 'Logo (optional)',
});

export const LOGO_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.integration.logo.description',
  {
    defaultMessage: 'Drag and drop a .svg file or Browse files',
  }
);

export const PREVIEW = i18n.translate('xpack.integrationAssistant.step.integration.preview', {
  defaultMessage: 'Preview',
});

export const LOGO_ERROR = i18n.translate('xpack.integrationAssistant.step.integration.logo.error', {
  defaultMessage: 'Error processing logo file',
});
