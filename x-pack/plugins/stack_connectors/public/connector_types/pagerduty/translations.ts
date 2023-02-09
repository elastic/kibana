/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SUMMARY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.pagerDuty.error.requiredSummaryText',
  {
    defaultMessage: 'Summary is required.',
  }
);

export const DEDUP_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.pagerDuty.error.requiredDedupKeyText',
  {
    defaultMessage: 'DedupKey is required when resolving or acknowledging an incident.',
  }
);

export const INTEGRATION_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.pagerDuty.error.requiredRoutingKeyText',
  {
    defaultMessage: 'An integration key / routing key is required.',
  }
);

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.pagerDuty.apiUrlTextFieldLabel',
  {
    defaultMessage: 'API URL (optional)',
  }
);

export const API_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.pagerDuty.apiUrlInvalid',
  {
    defaultMessage: 'Invalid API URL',
  }
);

export const INTEGRATION_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.pagerDuty.routingKeyTextFieldLabel',
  {
    defaultMessage: 'Integration key',
  }
);
