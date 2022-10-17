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

export const NOTE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.noteLabel',
  {
    defaultMessage: 'Note (optional)',
  }
);

export const DESCRIPTION_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.descriptionLabel',
  {
    defaultMessage: 'Description (optional)',
  }
);

export const MESSAGE_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.requiredMessageTextField',
  {
    defaultMessage: 'Message is required.',
  }
);

export const ALIAS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.aliasLabel',
  {
    defaultMessage: 'Alias',
  }
);

export const ALIAS_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.requiredAliasTextField',
  {
    defaultMessage: 'Alias is required.',
  }
);

export const ADVANCED_JSON_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.jsonEditorLabel',
  {
    defaultMessage: 'Alert fields',
  }
);

export const ADVANCED_JSON_ARIA = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.jsonEditorAriaLabel',
  {
    defaultMessage: 'Alert fields JSON editor',
  }
);

export const ADVANCED_EDITOR_FORBIDDEN_KEYS = (keys: string[]) =>
  i18n.translate('xpack.stackConnectors.components.opsgenie.jsonEditorError', {
    defaultMessage: 'Forbidden {numKeys, plural, =1 {key} other {keys}}: {forbiddenKeys}',
    values: { numKeys: keys.length, forbiddenKeys: keys.join(', ') },
  });

export const ADVANCED_OPTIONS = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.advancedOptions',
  {
    defaultMessage: 'Advanced Options',
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
