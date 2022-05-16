/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_SOURCE_LABEL = i18n.translate(
  'xpack.cases.connectors.casesWebhook.alertSourceLabel',
  {
    defaultMessage: 'Alert Source',
  }
);

export const CASE_ID_LABEL = i18n.translate('xpack.cases.connectors.casesWebhook.caseIdLabel', {
  defaultMessage: 'Case Id',
});

export const CASE_NAME_LABEL = i18n.translate('xpack.cases.connectors.casesWebhook.caseNameLabel', {
  defaultMessage: 'Case Name',
});

export const SEVERITY_LABEL = i18n.translate('xpack.cases.connectors.casesWebhook.severityLabel', {
  defaultMessage: 'Severity',
});

export const EMPTY_MAPPING_WARNING_TITLE = i18n.translate(
  'xpack.cases.connectors.casesWebhook.emptyMappingWarningTitle',
  {
    defaultMessage: 'This connector has missing field mappings',
  }
);

export const EMPTY_MAPPING_WARNING_DESC = i18n.translate(
  'xpack.cases.connectors.casesWebhook.emptyMappingWarningDesc',
  {
    defaultMessage:
      'This connector cannot be selected because it is missing the required case field mappings. You can edit this connector to add required field mappings or select a connector of type Cases.',
  }
);
