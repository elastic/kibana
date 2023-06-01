/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const API_KEY_LABEL = i18n.translate('xpack.stackConnectors.components.genAi.apiKeySecret', {
  defaultMessage: 'API Key',
});

export const API_PROVIDER_HEADING = i18n.translate(
  'xpack.stackConnectors.components.genAi.providerHeading',
  {
    defaultMessage: 'OpenAI provider',
  }
);

export const API_PROVIDER_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.apiProviderLabel',
  {
    defaultMessage: 'Select an OpenAI provider',
  }
);

export const OPEN_AI = i18n.translate('xpack.stackConnectors.components.genAi.openAi', {
  defaultMessage: 'OpenAI',
});

export const AZURE_AI = i18n.translate('xpack.stackConnectors.components.genAi.azureAi', {
  defaultMessage: 'Azure OpenAI',
});

export const DOCUMENTATION = i18n.translate(
  'xpack.stackConnectors.components.genAi.documentation',
  {
    defaultMessage: 'documentation',
  }
);

export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.genAi.urlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.genAi.error.requiredGenerativeAiBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);
export const BODY_INVALID = i18n.translate(
  'xpack.stackConnectors.security.genAi.params.error.invalidBodyText',
  {
    defaultMessage: 'Body does not have a valid JSON format.',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.genAi.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.genAi.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const API_PROVIDER_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.genAi.error.requiredApiProviderText',
  {
    defaultMessage: 'API provider is required.',
  }
);
