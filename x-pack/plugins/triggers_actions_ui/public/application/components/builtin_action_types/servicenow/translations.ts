/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.apiUrlTextFieldLabel',
  {
    defaultMessage: 'ServiceNow instance URL',
  }
);

export const API_URL_HELPTEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.apiUrlHelpText',
  {
    defaultMessage: 'Include the full URL.',
  }
);

export const API_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredApiUrlTextField',
  {
    defaultMessage: 'URL is required.',
  }
);

export const API_URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const API_URL_REQUIRE_HTTPS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requireHttpsApiUrlTextField',
  {
    defaultMessage: 'URL must start with https://.',
  }
);

export const AUTHENTICATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.authenticationLabel',
  {
    defaultMessage: 'Authentication',
  }
);

export const REMEMBER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.rememberValuesLabel',
  {
    defaultMessage:
      'Remember these values. You must reenter them each time you edit the connector.',
  }
);

export const REENTER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.reenterValuesLabel',
  {
    defaultMessage: 'You must authenticate each time you edit the connector.',
  }
);

export const USERNAME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.usernameTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredUsernameTextField',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredPasswordTextField',
  {
    defaultMessage: 'Password is required.',
  }
);

export const TITLE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.common.requiredShortDescTextField',
  {
    defaultMessage: 'Short description is required.',
  }
);

export const INCIDENT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.title',
  {
    defaultMessage: 'Incident',
  }
);

export const SECURITY_INCIDENT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenowSIR.title',
  {
    defaultMessage: 'Security Incident',
  }
);

export const SHORT_DESCRIPTION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.titleFieldLabel',
  {
    defaultMessage: 'Short description (required)',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.descriptionTextAreaFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const COMMENTS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.commentsTextAreaFieldLabel',
  {
    defaultMessage: 'Additional comments',
  }
);

export const CHOICES_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.unableToGetChoicesMessage',
  {
    defaultMessage: 'Unable to get choices',
  }
);

export const CATEGORY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.categoryTitle',
  {
    defaultMessage: 'Category',
  }
);

export const SUBCATEGORY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.subcategoryTitle',
  {
    defaultMessage: 'Subcategory',
  }
);

export const URGENCY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.urgencySelectFieldLabel',
  {
    defaultMessage: 'Urgency',
  }
);

export const SEVERITY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const IMPACT_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.impactSelectFieldLabel',
  {
    defaultMessage: 'Impact',
  }
);

export const PRIORITY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.prioritySelectFieldLabel',
  {
    defaultMessage: 'Priority',
  }
);

export const API_INFO_ERROR = (status: number) =>
  i18n.translate('xpack.triggersActionsUI.components.builtinActionTypes.servicenow.apiInfoError', {
    values: { status },
    defaultMessage: 'Received status: {status} when attempting to get application information',
  });

export const INSTALL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.install',
  {
    defaultMessage: 'install',
  }
);

export const INSTALLATION_CALLOUT_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.installationCalloutTitle',
  {
    defaultMessage:
      'To use this connector, first install the Elastic app from the ServiceNow app store.',
  }
);

export const UPDATE_SUCCESS_TOAST_TITLE = (connectorName: string) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.updateSuccessToastTitle',
    {
      defaultMessage: '{connectorName} connector updated',
      values: {
        connectorName,
      },
    }
  );

export const UPDATE_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.updateCalloutText',
  {
    defaultMessage: 'Connector has been updated.',
  }
);

export const VISIT_SN_STORE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.visitSNStore',
  {
    defaultMessage: 'Visit ServiceNow app store',
  }
);

export const SETUP_DEV_INSTANCE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.setupDevInstance',
  {
    defaultMessage: 'setup a developer instance',
  }
);

export const SN_INSTANCE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.snInstanceLabel',
  {
    defaultMessage: 'ServiceNow instance',
  }
);

export const UNKNOWN = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.unknown',
  {
    defaultMessage: 'UNKNOWN',
  }
);

export const CORRELATION_ID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.correlationID',
  {
    defaultMessage: 'Correlation ID (optional)',
  }
);

export const CORRELATION_DISPLAY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.correlationDisplay',
  {
    defaultMessage: 'Correlation display (optional)',
  }
);

export const EVENT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenowITOM.event',
  {
    defaultMessage: 'Event',
  }
);

/**
 * ITOM
 */
export const SOURCE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.sourceTextAreaFieldLabel',
  {
    defaultMessage: 'Source',
  }
);

export const EVENT_CLASS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.eventClassTextAreaFieldLabel',
  {
    defaultMessage: 'Source instance',
  }
);

export const RESOURCE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.resourceTextAreaFieldLabel',
  {
    defaultMessage: 'Resource',
  }
);

export const NODE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.nodeTextAreaFieldLabel',
  {
    defaultMessage: 'Node',
  }
);

export const METRIC_NAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.metricNameTextAreaFieldLabel',
  {
    defaultMessage: 'Metric name',
  }
);

export const TYPE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.typeTextAreaFieldLabel',
  {
    defaultMessage: 'Type',
  }
);

export const MESSAGE_KEY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.messageKeyTextAreaFieldLabel',
  {
    defaultMessage: 'Message key',
  }
);

export const SEVERITY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredSeverityTextField',
  {
    defaultMessage: 'Severity is required.',
  }
);

export const SEVERITY_REQUIRED_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severityRequiredSelectFieldLabel',
  {
    defaultMessage: 'Severity (required)',
  }
);
