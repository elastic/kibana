/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_MAX_RESULTS } from '../../../common/sentinelone/constants';

// config form
export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.config.urlTextFieldLabel',
  {
    defaultMessage: 'SentinelOne tenant URL',
  }
);

export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.config.tokenTextFieldLabel',
  {
    defaultMessage: 'API token',
  }
);

// params form
export const ASC = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.storyFieldLabel',
  {
    defaultMessage: 'SentinelOne Script',
  }
);

export const SCRIPT_TYPE_FILTER_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.scriptTypeFilterLabel',
  {
    defaultMessage: 'Script type',
  }
);

export const OS_TYPES_FILTER_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.osTypesFilterLabel',
  {
    defaultMessage: 'OS',
  }
);

export const STORY_ARIA_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.storyFieldAriaLabel',
  {
    defaultMessage: 'Select a SentinelOne script',
  }
);

export const KILL_PROCESS_ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.killProcessActionLabel',
  {
    defaultMessage: 'Kill process',
  }
);

export const ISOLATE_AGENT_ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.isolateAgentActionLabel',
  {
    defaultMessage: 'Isolate agent',
  }
);

export const RELEASE_AGENT_ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.releaseAgentActionLabel',
  {
    defaultMessage: 'Release agent',
  }
);

export const AGENTS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.agentsFieldLabel',
  {
    defaultMessage: 'SentinelOne agent',
  }
);

export const AGENTS_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.agentsFieldPlaceholder',
  {
    defaultMessage: 'Select a single agent',
  }
);

export const ACTION_TYPE_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.actionTypeFieldLabel',
  {
    defaultMessage: 'Action Type',
  }
);

export const COMMAND_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.commandFieldLabel',
  {
    defaultMessage: 'Command',
  }
);

export const CHANGE_ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.changeActionButton',
  {
    defaultMessage: 'Change action',
  }
);

export const WEBHOOK_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookFieldLabel',
  {
    defaultMessage: 'SentinelOne Webhook action',
  }
);
export const WEBHOOK_HELP = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookHelp',
  {
    defaultMessage: 'The data entry action in the story',
  }
);
export const WEBHOOK_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookPlaceholder',
  {
    defaultMessage: 'Select a webhook action',
  }
);
export const WEBHOOK_DISABLED_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookDisabledPlaceholder',
  {
    defaultMessage: 'Select a story first',
  }
);
export const WEBHOOK_ARIA_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookFieldAriaLabel',
  {
    defaultMessage: 'Select a SentinelOne webhook action',
  }
);

export const WEBHOOK_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookUrlFieldLabel',
  {
    defaultMessage: 'Webhook URL',
  }
);
export const WEBHOOK_URL_FALLBACK_TITLE = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookUrlFallbackTitle',
  {
    defaultMessage: 'SentinelOne API results limit reached',
  }
);
export const WEBHOOK_URL_FALLBACK_TEXT = (entity: 'Story' | 'Webhook') =>
  i18n.translate('xpack.stackConnectors.security.sentinelone.params.webhookUrlFallbackText', {
    values: { entity, limit: API_MAX_RESULTS },
    defaultMessage: `Not possible to retrieve more than {limit} results from the SentinelOne {entity} API. If your {entity} does not appear in the list, please fill the Webhook URL below`,
  });
export const WEBHOOK_URL_HELP = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookUrlHelp',
  {
    defaultMessage: 'The Story and Webhook selectors will be ignored if the Webhook URL is defined',
  }
);
export const WEBHOOK_URL_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.webhookUrlPlaceholder',
  {
    defaultMessage: 'Paste the Webhook URL here',
  }
);
export const DISABLED_BY_WEBHOOK_URL_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.disabledByWebhookUrlPlaceholder',
  {
    defaultMessage: 'Remove the Webhook URL to use this selector',
  }
);

export const BODY_LABEL = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.bodyFieldLabel',
  {
    defaultMessage: 'Body',
  }
);
export const AGENTS_ERROR = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.componentError.storiesRequestFailed',
  {
    defaultMessage: 'Error retrieving agent from SentinelOne',
  }
);

export const REMOTE_SCRIPTS_ERROR = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.componentError.remoteScriptsRequestFailed',
  {
    defaultMessage: 'Error retrieving remote scripts from SentinelOne',
  }
);

export const WEBHOOKS_ERROR = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.componentError.webhooksRequestFailed',
  {
    defaultMessage: 'Error retrieving webhook actions from SentinelOne',
  }
);

export const STORY_NOT_FOUND_WARNING = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.componentWarning.storyNotFound',
  {
    defaultMessage: 'Cannot find the saved story. Please select a valid story from the selector',
  }
);
export const WEBHOOK_NOT_FOUND_WARNING = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.componentWarning.webhookNotFound',
  {
    defaultMessage:
      'Cannot find the saved webhook. Please select a valid webhook from the selector',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.requiredBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);

export const BODY_INVALID = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.invalidBodyText',
  {
    defaultMessage: 'Body does not have a valid JSON format.',
  }
);

export const STORY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.requiredStoryText',
  {
    defaultMessage: 'Story is required.',
  }
);
export const WEBHOOK_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.requiredWebhookText',
  {
    defaultMessage: 'Webhook is required.',
  }
);
export const WEBHOOK_PATH_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.requiredWebhookPathText',
  {
    defaultMessage: 'Webhook action path is missing.',
  }
);
export const WEBHOOK_SECRET_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.sentinelone.params.error.requiredWebhookSecretText',
  {
    defaultMessage: 'Webhook action secret is missing.',
  }
);
