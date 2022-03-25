/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_NEWS_MESSAGE = i18n.translate('xpack.securitySolution.newsFeed.noNewsMessage', {
  defaultMessage: 'Your current news feed URL returned no recent news.',
});

export const NO_NEWS_MESSAGE_ADMIN = i18n.translate(
  'xpack.securitySolution.newsFeed.noNewsMessageForAdmin',
  {
    defaultMessage:
      'Your current news feed URL returned no recent news. You may update the URL or disable security news via',
  }
);

export const ADVANCED_SETTINGS_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.newsFeed.advancedSettingsLinkTitle',
  {
    defaultMessage: 'Security Solution advanced settings',
  }
);
