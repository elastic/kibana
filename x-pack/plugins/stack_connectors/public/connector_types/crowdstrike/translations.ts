/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// config form

export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.security.crowdstrike.config.urlTextFieldLabel',
  {
    defaultMessage: 'Crowdstrike API URL',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.security.crowdstrike.config.clientIdTextFieldLabel',
  {
    defaultMessage: 'Crowdstrike Client ID',
  }
);

export const CLIENT_SECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.security.crowdstrike.config.clientSecretTextFieldLabel',
  {
    defaultMessage: 'Client Secret',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.crowdstrike.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.crowdstrike.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);
