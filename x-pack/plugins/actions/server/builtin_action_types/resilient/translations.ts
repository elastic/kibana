/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.actions.builtin.resilientTitle', {
  defaultMessage: 'IBM Resilient',
});

export const WHITE_LISTED_ERROR = (message: string) =>
  i18n.translate('xpack.actions.builtin.configuration.apiWhitelistError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });

// TODO: remove when Case mappings will be removed
export const MAPPING_EMPTY = i18n.translate('xpack.actions.builtin.configuration.emptyMapping', {
  defaultMessage: '[incidentConfiguration.mapping]: expected non-empty but got empty',
});

export const RESILIENT_DESC = i18n.translate('xpack.actions.builtin.resilientSelectMessageText', {
  defaultMessage: 'Push or update SIEM case data to a new issue in resilient',
});

export const RESILIENT_PROJECT_KEY_LABEL = i18n.translate('xpack.actions.builtin.resilientOrgId', {
  defaultMessage: 'Organization Id',
});

export const RESILIENT_PROJECT_KEY_REQUIRED = i18n.translate(
  'xpack.actions.builtin.resilientRequiredOrgIdTextField',
  {
    defaultMessage: 'Organization Id',
  }
);

export const RESILIENT_API_KEY_ID_LABEL = i18n.translate(
  'xpack.actions.builtin.resilientApiKeyId',
  {
    defaultMessage: 'API key id',
  }
);

export const RESILIENT_API_KEY_ID_REQUIRED = i18n.translate(
  'xpack.actions.builtin.resilientRequiredApiKeyIdTextField',
  {
    defaultMessage: 'API key id is required',
  }
);

export const RESILIENT_API_KEY_SECRET_LABEL = i18n.translate(
  'xpack.actions.builtin.resilientApiKeySecret',
  {
    defaultMessage: 'API key secret',
  }
);

export const RESILIENT_API_KEY_SECRET_REQUIRED = i18n.translate(
  'xpack.actions.builtin.resilientRequiredApiKeySecretTextField',
  {
    defaultMessage: 'API key secret is required',
  }
);

export const MAPPING_FIELD_NAME = i18n.translate(
  'xpack.securitySolution.case.configureCases.mappingFieldName',
  {
    defaultMessage: 'Name',
  }
);
