/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    defaultMessage: 'Field Mappings',
  }
);

export const SW_ALERT_SOURCE_KEY_NAME_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertSourceKeyNameTextFieldLabel',
  {
    defaultMessage: 'Source Key',
  }
);

export const SW_SEVERITY_KEY_NAME_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severityKeyNameTextFieldLabel',
  {
    defaultMessage: 'Severity Key',
  }
);

export const SW_MAPPING_DESCRIPTION_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.mappingDescriptionTextFieldLabel',
  {
    defaultMessage: 'Used to specify the field names in the Swimlane Application',
  }
);

export const SW_ALERT_NAME_KEY_NAME_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertNameKeyNameTextFieldLabel',
  {
    defaultMessage: 'Alert Name Key',
  }
);

export const SW_CASE_ID_KEY_NAME_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseIdKeyNameTextFieldLabel',
  {
    defaultMessage: 'Case ID Key',
  }
);

export const SW_CASE_NAME_KEY_NAME_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseNameKeyNameTextFieldLabel',
  {
    defaultMessage: 'Case Name Key',
  }
);

export const SW_COMMENTS_KEY_NAME_TEXT_FIELD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.commentsKeyNameTextFieldLabel',
  {
    defaultMessage: 'Comments Key',
  }
);

export const SW_REENTER_VALUE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.reenterValueLabel',
  { defaultMessage: 'This key is encrypted. Please reenter a value for this field.' }
);
