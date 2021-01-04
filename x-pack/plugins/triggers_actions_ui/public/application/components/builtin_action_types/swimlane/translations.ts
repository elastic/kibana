/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SW_SELECT_MESSAGE_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.selectMessageText',
  {
    defaultMessage: 'Create record in Swimlane',
  }
);

export const SW_ACTION_TYPE_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.actionTypeTitle',
  {
    defaultMessage: 'Create Swimlane Record',
  }
);

export const SW_REQUIRED_ALERT_NAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAlertName',
  {
    defaultMessage: 'AlertName is required.',
  }
);

export const SW_REQUIRED_APP_ID_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAppIdText',
  {
    defaultMessage: 'An AppId is required.',
  }
);

export const SW_REQUIRED_FIELD_MAPPINGS_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAppIdText',
  {
    defaultMessage: 'Field mappings are required.',
  }
);

export const SW_REQUIRED_API_TOKEN_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredApiTokenText',
  {
    defaultMessage: 'An API token is required.',
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

export const SW_API_URL_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiUrlTextFieldLabel',
  {
    defaultMessage: 'API URL',
  }
);

export const SW_API_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.requiredApiUrlTextField',
  {
    defaultMessage: 'URL is required.',
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
    defaultMessage: 'Application Id',
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

export const SW_ALERT_SOURCE_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertSourceFieldLabel',
  {
    defaultMessage: 'Source',
  }
);

export const SW_SEVERITY_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severityFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const SW_MAPPING_DESCRIPTION_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.mappingDescriptionTextFieldLabel',
  {
    defaultMessage: 'Used to specify the field names in the Swimlane Application',
  }
);

export const SW_ALERT_NAME_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertNameFieldLabel',
  {
    defaultMessage: 'Alert Name',
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
    defaultMessage: 'Case Name',
  }
);

export const SW_COMMENTS_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.commentsFieldLabel',
  {
    defaultMessage: 'Comments',
  }
);

export const SW_REMEMBER_VALUE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.rememberValueLabel',
  { defaultMessage: 'Remember this value. You must reenter it each time you edit the connector.' }
);

export const SW_REENTER_VALUE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.reenterValueLabel',
  { defaultMessage: 'This key is encrypted. Please reenter a value for this field.' }
);

export const SW_CONFIGURE_CONNECTION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.configureConnectionLabel',
  { defaultMessage: 'Configure API Connection' }
);

export const SW_RETRIEVE_CONFIGURATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.retrieveConfigurationLabel',
  { defaultMessage: 'Configure Fields' }
);

export const SW_RETRIEVE_CONFIGURATION_RESET_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.resetConfigurationLabel',
  { defaultMessage: 'Reset Configuration' }
);
