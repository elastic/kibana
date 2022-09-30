/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const API_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.apiKeySecret',
  {
    defaultMessage: 'API Key',
  }
);

export const ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.actionLabel',
  {
    defaultMessage: 'Action',
  }
);

export const CREATE_ALERT_ACTION = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.createAlertAction',
  {
    defaultMessage: 'Create Alert',
  }
);

export const CLOSE_ALERT_ACTION = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.closeAlertAction',
  {
    defaultMessage: 'Close Alert',
  }
);

export const MESSAGE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.messageLabel',
  {
    defaultMessage: 'Message',
  }
);

export const NAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.resilient.requiredNameTextField',
  {
    defaultMessage: 'Name is required.',
  }
);

export const INCIDENT_TYPES_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.resilient.unableToGetIncidentTypesMessage',
  {
    defaultMessage: 'Unable to get incident types',
  }
);

export const SEVERITY_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.resilient.unableToGetSeverityMessage',
  {
    defaultMessage: 'Unable to get severity',
  }
);
