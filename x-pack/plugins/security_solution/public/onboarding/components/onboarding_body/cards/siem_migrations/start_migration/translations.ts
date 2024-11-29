/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_MIGRATION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.title',
  {
    defaultMessage: 'Translate your existing SIEM Rules to Elastic',
  }
);

export const START_MIGRATION_CARD_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.title',
  {
    defaultMessage: 'Export your Splunk® SIEM rules to start translation.',
  }
);

export const START_MIGRATION_CARD_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.description',
  {
    defaultMessage:
      'Upload your rules before importing data to identify the integrations, data streams, and available details of your SIEM rules. Click “Upload Rules” to view step-by-step instructions to export and uploading the rules.',
  }
);

export const START_MIGRATION_CARD_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.button',
  {
    defaultMessage: 'Upload Rules',
  }
);

export const START_MIGRATION_CARD_UPLOAD_READ_MORE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.readMore',
  {
    defaultMessage: 'Read more about our AI powered translations and other features.',
  }
);

export const START_MIGRATION_CARD_UPLOAD_READ_DOCS = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.readAiDocsLink',
  {
    defaultMessage: 'Read AI docs',
  }
);
