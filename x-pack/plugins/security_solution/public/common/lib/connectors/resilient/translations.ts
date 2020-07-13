/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const RESILIENT_DESC = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.selectMessageText',
  {
    defaultMessage: 'Push or update SIEM case data to a new issue in resilient',
  }
);

export const RESILIENT_TITLE = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.actionTypeTitle',
  {
    defaultMessage: 'IBM Resilient',
  }
);

export const RESILIENT_PROJECT_KEY_LABEL = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.orgId',
  {
    defaultMessage: 'Organization Id',
  }
);

export const RESILIENT_PROJECT_KEY_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.requiredOrgIdTextField',
  {
    defaultMessage: 'Organization Id',
  }
);

export const RESILIENT_API_KEY_ID_LABEL = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.apiKeyId',
  {
    defaultMessage: 'API key id',
  }
);

export const RESILIENT_API_KEY_ID_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.requiredApiKeyIdTextField',
  {
    defaultMessage: 'API key id is required',
  }
);

export const RESILIENT_API_KEY_SECRET_LABEL = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.apiKeySecret',
  {
    defaultMessage: 'API key secret',
  }
);

export const RESILIENT_API_KEY_SECRET_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.connectors.resilient.requiredApiKeySecretTextField',
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
