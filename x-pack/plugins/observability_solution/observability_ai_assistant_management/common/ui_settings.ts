/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import {
  aiAssistantLogsIndexPattern,
  aiAssistantResponseLanguage,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  DEFAULT_LANGUAGE_OPTION,
  LANGUAGE_OPTIONS,
} from '@kbn/observability-ai-assistant-plugin/common';

export const uiSettings: Record<string, UiSettingsParams> = {
  [aiAssistantResponseLanguage]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.userPreferencesLabel',
      {
        defaultMessage: 'Response language',
      }
    ),
    value: DEFAULT_LANGUAGE_OPTION.value,
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.selectYourLanguageLabel',
      {
        defaultMessage:
          'Select the language you wish the Assistant to use when generating responses.',
      }
    ),

    // Argument of type 'Type<string>[]' is not assignable to parameter of type '[Type<string>]'.
    // @ts-expect-error
    schema: schema.oneOf(LANGUAGE_OPTIONS.map((lang) => schema.literal(lang.value))),
    type: 'select',
    options: LANGUAGE_OPTIONS.map((lang) => lang.value),
    optionLabels: LANGUAGE_OPTIONS.reduce(
      (acc, { value, label }) => ({ ...acc, [value]: label }),
      {}
    ),
    requiresPageReload: true,
  },
  [aiAssistantLogsIndexPattern]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsTab.h3.logIndexPatternLabel',
      { defaultMessage: 'Logs index pattern' }
    ),
    value: 'logs-*',
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.logIndexPatternDescription',
      {
        defaultMessage:
          'Index pattern used by the AI Assistant when querying for logs. Logs are categorised and used for root cause analysis',
      }
    ),
    schema: schema.string(),
    type: 'string',
    requiresPageReload: true,
  },
};
