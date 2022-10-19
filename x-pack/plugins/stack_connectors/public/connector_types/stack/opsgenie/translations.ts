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
    defaultMessage: 'Message (required)',
  }
);

export const NOTE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.noteLabel',
  {
    defaultMessage: 'Note',
  }
);

export const DESCRIPTION_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const MESSAGE_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.requiredMessageTextField',
  {
    defaultMessage: 'Message is required.',
  }
);

export const MESSAGE_FIELD_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.messageFieldRequired',
  {
    defaultMessage: '"message" field must be populated with a value other than just whitespace',
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

export const USE_JSON_EDITOR_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.jsonEditorLabel',
  {
    defaultMessage: 'Use JSON editor',
  }
);

export const JSON_EDITOR_ARIA = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.jsonEditorAriaLabel',
  {
    defaultMessage: 'JSON editor',
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

export const SOURCE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.sourceLabel',
  {
    defaultMessage: 'Source',
  }
);

export const USER_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.userLabel',
  {
    defaultMessage: 'User',
  }
);

export const ENTITY_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.entityLabel',
  {
    defaultMessage: 'Entity',
  }
);

export const TAGS_HELP = i18n.translate('xpack.stackConnectors.components.opsgenie.tagsHelp', {
  defaultMessage:
    'Type one or more custom identifying tags for this case. Press enter after each tag to begin a new one.',
});

export const TAGS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.tagsLabel',
  { defaultMessage: 'Opsgenie Tags' }
);
