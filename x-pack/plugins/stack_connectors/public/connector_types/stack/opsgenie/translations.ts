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

export const MESSAGE_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.requiredMessageTextField',
  {
    defaultMessage: 'Message is required.',
  }
);

export const MESSAGE_NON_WHITESPACE = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.messageNotWhitespaceForm',
  { defaultMessage: 'Message must be populated with a value other than just whitespace' }
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
    defaultMessage: 'Create alert',
  }
);

export const CLOSE_ALERT_ACTION = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.closeAlertAction',
  {
    defaultMessage: 'Close alert',
  }
);

export const NOTE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.noteLabel',
  {
    defaultMessage: 'Note',
  }
);

export const ALIAS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.aliasLabel',
  {
    defaultMessage: 'Alias',
  }
);

export const ALIAS_REQUIRED_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.aliasRequiredLabel',
  {
    defaultMessage: 'Alias (required)',
  }
);

export const ALIAS_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.requiredAliasTextField',
  {
    defaultMessage: 'Alias is required.',
  }
);

export const MORE_OPTIONS = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.moreOptions',
  {
    defaultMessage: 'More options',
  }
);

export const HIDE_OPTIONS = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.hideOptions',
  {
    defaultMessage: 'Hide options',
  }
);

export const USER_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.userLabel',
  {
    defaultMessage: 'User',
  }
);

export const SOURCE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.sourceLabel',
  {
    defaultMessage: 'Source',
  }
);

export const JSON_EDITOR_ERROR = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.jsonEditorError',
  {
    defaultMessage: 'JSON editor error exists',
  }
);

export const OPSGENIE_DOCUMENTATION = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.documentation',
  {
    defaultMessage: 'Opsgenie documentation',
  }
);

export const OPSGENIE_ALIAS_HELP = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.fieldAliasHelpText',
  {
    defaultMessage: 'The unique alert identifier used for de-deduplication in Opsgenie.',
  }
);

export const OPSGENIE_ENTITY_HELP = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.fieldEntityHelpText',
  {
    defaultMessage: 'The domain of the alert. For example, the application name.',
  }
);

export const OPSGENIE_SOURCE_HELP = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.fieldSourceHelpText',
  {
    defaultMessage: 'The display name for the source of the alert.',
  }
);

export const OPSGENIE_USER_HELP = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.fieldUserHelpText',
  {
    defaultMessage: 'The display name for the owner.',
  }
);
