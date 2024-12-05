/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// config form
export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.urlTextFieldLabel',
  {
    defaultMessage: 'Microsoft Defender for Endpoint API URL',
  }
);

export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.tokenTextFieldLabel',
  {
    defaultMessage: 'API token',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);
