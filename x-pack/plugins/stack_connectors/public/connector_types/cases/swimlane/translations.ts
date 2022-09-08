/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SW_REQUIRED_RULE_NAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredRuleName',
  {
    defaultMessage: 'Rule name is required.',
  }
);

export const SW_REQUIRED_APP_ID_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAppIdText',
  {
    defaultMessage: 'An App ID is required.',
  }
);

export const SW_GET_APPLICATION_API_ERROR = (id: string | null) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.swimlane.unableToGetApplicationMessage',
    {
      defaultMessage: 'Unable to get application with id {id}',
      values: { id },
    }
  );

export const SW_GET_APPLICATION_API_NO_FIELDS_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlane.unableToGetApplicationFieldsMessage',
  {
    defaultMessage: 'Unable to get application fields',
  }
);

export const SW_API_URL_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiUrlTextFieldLabel',
  {
    defaultMessage: 'API Url',
  }
);

export const SW_API_URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const SW_APP_ID_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.appIdTextFieldLabel',
  {
    defaultMessage: 'Application ID',
  }
);

export const SW_API_TOKEN_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiTokenTextFieldLabel',
  {
    defaultMessage: 'API Token',
  }
);

export const SW_MAPPING_TITLE_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.mappingTitleTextFieldLabel',
  {
    defaultMessage: 'Configure Field Mappings',
  }
);

export const SW_SEVERITY_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severityFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const SW_RULE_NAME_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.ruleNameFieldLabel',
  {
    defaultMessage: 'Rule name',
  }
);

export const SW_ALERT_ID_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertIdFieldLabel',
  {
    defaultMessage: 'Alert ID',
  }
);

export const SW_CASE_ID_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseIdFieldLabel',
  {
    defaultMessage: 'Case ID',
  }
);

export const SW_CASE_NAME_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseNameFieldLabel',
  {
    defaultMessage: 'Case name',
  }
);

export const SW_COMMENTS_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.commentsFieldLabel',
  {
    defaultMessage: 'Comments',
  }
);

export const SW_DESCRIPTION_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.descriptionFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const SW_CONFIGURE_CONNECTION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.configureConnectionLabel',
  { defaultMessage: 'Configure API Connection' }
);

export const SW_CONNECTOR_TYPE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.connectorType',
  {
    defaultMessage: 'Connector Type',
  }
);

export const EMPTY_MAPPING_WARNING_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.emptyMappingWarningTitle',
  {
    defaultMessage: 'This connector has missing field mappings',
  }
);

export const EMPTY_MAPPING_WARNING_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.emptyMappingWarningDesc',
  {
    defaultMessage:
      'This connector cannot be selected because it is missing the required alert field mappings. You can edit this connector to add required field mappings or select a connector of type Alerts.',
  }
);

export const SW_REQUIRED_SEVERITY = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredSeverity',
  {
    defaultMessage: 'Severity is required.',
  }
);

export const SW_REQUIRED_CASE_NAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredCaseName',
  {
    defaultMessage: 'Case name is required.',
  }
);

export const SW_REQUIRED_CASE_ID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredCaseID',
  {
    defaultMessage: 'Case ID is required.',
  }
);

export const SW_REQUIRED_COMMENTS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredComments',
  {
    defaultMessage: 'Comments are required.',
  }
);

export const SW_REQUIRED_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredDescription',
  {
    defaultMessage: 'Description is required.',
  }
);

export const SW_REQUIRED_ALERT_ID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAlertID',
  {
    defaultMessage: 'Alert ID is required.',
  }
);

export const SW_BACK = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.prevStep',
  {
    defaultMessage: 'Back',
  }
);

export const SW_NEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.nextStep',
  {
    defaultMessage: 'Next',
  }
);

export const SW_FIELDS_BUTTON_HELP_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.nextStepHelpText',
  {
    defaultMessage:
      'If field mappings are not configured, Swimlane connector type will be set to all.',
  }
);
