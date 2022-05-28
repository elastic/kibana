/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_KEY_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.createKey.buttonLabel',
  {
    defaultMessage: 'Create key',
  }
);

export const ENDPOINT_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.endpointTitle',
  {
    defaultMessage: 'Endpoint',
  }
);

export const NAME_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.nameTitle',
  {
    defaultMessage: 'Name',
  }
);

export const KEY_TITLE = i18n.translate('xpack.enterpriseSearch.workplaceSearch.apiKeys.keyTitle', {
  defaultMessage: 'Key',
});

export const COPIED_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.copied.tooltip',
  {
    defaultMessage: 'Copied',
  }
);

export const COPY_API_ENDPOINT_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.copyApiEndpoint.buttonLabel',
  {
    defaultMessage: 'Copy API Endpoint to clipboard.',
  }
);

export const COPY_API_KEY_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.copyApiKey.buttonLabel',
  {
    defaultMessage: 'Copy API Key to clipboard.',
  }
);

export const DELETE_API_KEY_BUTTON_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.deleteApiKey.buttonDescription',
  {
    defaultMessage: 'Delete API key',
  }
);

export const CREATE_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.workplaceSearch.apiKeys.createdMessage', {
    defaultMessage: "API key '{name}' was created",
    values: { name },
  });

export const DELETE_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.workplaceSearch.apiKeys.deletedMessage', {
    defaultMessage: "API key '{name}' was deleted",
    values: { name },
  });

export const API_KEY_FLYOUT_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.flyoutTitle',
  {
    defaultMessage: 'Create a new key',
  }
);

export const API_KEY_FORM_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.formLabel',
  {
    defaultMessage: 'Key name',
  }
);

export const API_KEY_FORM_HELP_TEXT = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.workplaceSearch.apiKeys.formHelpText', {
    defaultMessage: 'Your key will be named: {name}',
    values: { name },
  });

export const API_KEY_NAME_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.namePlaceholder',
  {
    defaultMessage: 'i.e., my-api-key',
  }
);

export const SHOW_API_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.showApiKeyLabel',
  {
    defaultMessage: 'Show API Key',
  }
);

export const HIDE_API_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.hideApiKeyLabel',
  {
    defaultMessage: 'Hide API Key',
  }
);

export const API_KEYS_EMPTY_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.emptyTitle',
  {
    defaultMessage: 'Create your first API key',
  }
);

export const API_KEYS_EMPTY_BODY = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.emptyBody',
  {
    defaultMessage: 'Allow applications to access Elastic Workplace Search on your behalf.',
  }
);

export const API_KEYS_EMPTY_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.emptyButtonLabel',
  {
    defaultMessage: 'Learn about API keys',
  }
);

export const API_KEYS_CONFIRM_DELETE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.confirmDeleteTitle',
  {
    defaultMessage: 'Delete API key',
  }
);

export const API_KEYS_CONFIRM_DELETE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.apiKeys.confirmDeleteLabel',
  {
    defaultMessage: 'Are you sure you want to delete this API key? This action cannot be undone.',
  }
);
