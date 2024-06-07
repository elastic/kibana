/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.integrationAssistant.pages.header.title', {
  defaultMessage: 'Integrations Assistant',
});

export const SELECT_A_CONNECTOR = i18n.translate(
  'xpack.integrationAssistant.pages.header.selectAConnector',
  {
    defaultMessage: 'Select a connector',
  }
);

export const BETA = i18n.translate('xpack.integrationAssistant.pages.header.betaBadge', {
  defaultMessage: 'Technical preview',
});

export const BETA_TOOLTIP = i18n.translate('xpack.integrationAssistant.pages.header.betaTooltip', {
  defaultMessage:
    'This functionality is in technical preview and is subject to change. Please use the Integrations Assistant with caution in production environments.',
});
