/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.apiUrlTextFieldLabel',
  {
    defaultMessage: 'ServiceNow instance URL',
  }
);

export const API_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const AUTHENTICATION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.authenticationLabel',
  {
    defaultMessage: 'Authentication',
  }
);

export const USERNAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.usernameTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredUsernameTextField',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const TITLE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredShortDescTextField',
  {
    defaultMessage: 'Short description is required.',
  }
);

export const CORRELATION_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredCorrelationIdTextField',
  {
    defaultMessage: 'Correlation id is required.',
  }
);

export const INCIDENT = i18n.translate('xpack.stackConnectors.components.serviceNow.title', {
  defaultMessage: 'Incident',
});

export const SECURITY_INCIDENT = i18n.translate(
  'xpack.stackConnectors.components.serviceNowSIR.title',
  {
    defaultMessage: 'Security incident',
  }
);

export const SHORT_DESCRIPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.titleFieldLabel',
  {
    defaultMessage: 'Short description',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.descriptionTextAreaFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const COMMENTS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.commentsTextAreaFieldLabel',
  {
    defaultMessage: 'Additional comments',
  }
);

export const CHOICES_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.unableToGetChoicesMessage',
  {
    defaultMessage: 'Unable to get choices',
  }
);

export const CATEGORY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.categoryTitle',
  {
    defaultMessage: 'Category',
  }
);

export const SUBCATEGORY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.subcategoryTitle',
  {
    defaultMessage: 'Subcategory',
  }
);

export const URGENCY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.urgencySelectFieldLabel',
  {
    defaultMessage: 'Urgency',
  }
);

export const SEVERITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.severitySelectFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const IMPACT_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.impactSelectFieldLabel',
  {
    defaultMessage: 'Impact',
  }
);

export const PRIORITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.prioritySelectFieldLabel',
  {
    defaultMessage: 'Priority',
  }
);

export const API_INFO_ERROR = (status: number) =>
  i18n.translate('xpack.stackConnectors.components.serviceNow.apiInfoError', {
    values: { status },
    defaultMessage: 'Received status: {status} when attempting to get application information',
  });

export const FETCH_ERROR = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.fetchErrorMsg',
  {
    defaultMessage:
      'Failed to fetch. Check the URL or the CORS configuration of your ServiceNow instance.',
  }
);

export const INSTALLATION_CALLOUT_TITLE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.installationCalloutTitle',
  {
    defaultMessage:
      'To use this connector, first install the Elastic app from the ServiceNow app store.',
  }
);

export const UPDATE_SUCCESS_TOAST_TITLE = (connectorName: string) =>
  i18n.translate('xpack.stackConnectors.components.serviceNow.updateSuccessToastTitle', {
    defaultMessage: '{connectorName} connector updated',
    values: {
      connectorName,
    },
  });

export const UPDATE_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.updateCalloutText',
  {
    defaultMessage: 'Connector has been updated.',
  }
);

export const VISIT_SN_STORE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.visitSNStore',
  {
    defaultMessage: 'Visit ServiceNow app store',
  }
);

export const SETUP_DEV_INSTANCE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.setupDevInstance',
  {
    defaultMessage: 'setup a developer instance',
  }
);

export const SN_INSTANCE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.snInstanceLabel',
  {
    defaultMessage: 'ServiceNow instance',
  }
);

export const UNKNOWN = i18n.translate('xpack.stackConnectors.components.serviceNow.unknown', {
  defaultMessage: 'UNKNOWN',
});

export const CORRELATION_ID = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.correlationID',
  {
    defaultMessage: 'Correlation ID',
  }
);

export const CORRELATION_DISPLAY = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.correlationDisplay',
  {
    defaultMessage: 'Correlation display',
  }
);

export const EVENT = i18n.translate('xpack.stackConnectors.components.serviceNowITOM.event', {
  defaultMessage: 'Event',
});

/**
 * ITOM
 */
export const SOURCE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.sourceTextAreaFieldLabel',
  {
    defaultMessage: 'Source',
  }
);

export const EVENT_CLASS = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.eventClassTextAreaFieldLabel',
  {
    defaultMessage: 'Source instance',
  }
);

export const RESOURCE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.resourceTextAreaFieldLabel',
  {
    defaultMessage: 'Resource',
  }
);

export const NODE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.nodeTextAreaFieldLabel',
  {
    defaultMessage: 'Node',
  }
);

export const METRIC_NAME = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.metricNameTextAreaFieldLabel',
  {
    defaultMessage: 'Metric name',
  }
);

export const TYPE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.typeTextAreaFieldLabel',
  {
    defaultMessage: 'Type',
  }
);

export const MESSAGE_KEY = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.messageKeyTextAreaFieldLabel',
  {
    defaultMessage: 'Message key',
  }
);

export const SEVERITY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredSeverityTextField',
  {
    defaultMessage: 'Severity is required.',
  }
);

export const CLIENTID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.clientIdTextFieldLabel',
  {
    defaultMessage: 'Client ID',
  }
);

export const CLIENTSECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.clientSecretTextFieldLabel',
  {
    defaultMessage: 'Client secret',
  }
);

export const KEY_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.keyIdTextFieldLabel',
  {
    defaultMessage: 'JWT verifier key ID',
  }
);

export const USER_IDENTIFIER_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.userEmailTextFieldLabel',
  {
    defaultMessage: 'User identifier',
  }
);

export const PRIVATE_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.privateKeyTextFieldLabel',
  {
    defaultMessage: 'Private key',
  }
);

export const PRIVATE_KEY_PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.privateKeyPassTextFieldLabel',
  {
    defaultMessage: 'Private key password',
  }
);

export const PRIVATE_KEY_PASSWORD_HELPER_TEXT = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.privateKeyPassLabelHelpText',
  {
    defaultMessage: 'This is only required if you have set a password on your private key',
  }
);

export const CLIENTID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredClientIdTextField',
  {
    defaultMessage: 'Client ID is required.',
  }
);

export const PRIVATE_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredPrivateKeyTextField',
  {
    defaultMessage: 'Private key is required.',
  }
);

export const KEYID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredKeyIdTextField',
  {
    defaultMessage: 'JWT verifier key ID is required.',
  }
);

export const USER_IDENTIFIER_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredUserIdentifierTextField',
  {
    defaultMessage: 'User identifier is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredPasswordTextField',
  {
    defaultMessage: 'Password is required.',
  }
);

export const CLIENTSECRET_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredClientSecretTextField',
  {
    defaultMessage: 'Client secret is required.',
  }
);

export const IS_OAUTH = i18n.translate('xpack.stackConnectors.components.serviceNow.useOAuth', {
  defaultMessage: 'Use OAuth authentication',
});

export const OPTIONAL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const REQUIRED_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.requiredLabel',
  {
    defaultMessage: 'Required',
  }
);

export const EVENT_ACTION_TRIGGER = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.eventActionTriggerOptionLabel',
  {
    defaultMessage: 'Trigger',
  }
);

export const EVENT_ACTION_RESOLVE = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.eventActionResolveOptionLabel',
  {
    defaultMessage: 'Resolve',
  }
);

export const EVENT_ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.serviceNowITSM.eventActionFieldLabel',
  {
    defaultMessage: 'Event action',
  }
);
