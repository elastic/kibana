/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  LANGUAGE_OPTIONS,
  DEFAULT_LANGUAGE_OPTION,
} from '@kbn/observability-ai-assistant-plugin/public';
import {
  aiAssistantLogsIndexPattern,
  aiAssistantResponseLanguage,
} from '@kbn/observability-ai-assistant-plugin/public';
import { FieldDefinition } from '@kbn/management-settings-types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

export function getFieldDefinitions(
  uiSettings: IUiSettingsClient
): Record<string, FieldDefinition & { isSavingEnabled?: boolean }> {
  return [
    {
      id: aiAssistantResponseLanguage,
      defaultValueDisplay: DEFAULT_LANGUAGE_OPTION.label,
      defaultValue: DEFAULT_LANGUAGE_OPTION.value,
      displayName: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.userPreferencesLabel',
        {
          defaultMessage: 'Response language',
        }
      ),
      description: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.selectYourLanguageLabel',
        {
          defaultMessage:
            'Select the language you wish the Assistant to use when generating responses.',
        }
      ),
      type: 'select',
      options: {
        values: LANGUAGE_OPTIONS.map(({ value }) => value),
        labels: LANGUAGE_OPTIONS.reduce(
          (acc, { value, label }) => ({ ...acc, [value]: label }),
          {}
        ),
      },
    },
    {
      id: aiAssistantLogsIndexPattern,
      defaultValue: 'logs-*',
      displayName: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsTab.h3.logIndexPatternLabel',
        { defaultMessage: 'Logs index pattern' }
      ),
      type: 'string',
      description: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.logIndexPatternDescription',
        {
          defaultMessage:
            'Index pattern used by the AI Assistant when querying for logs. Logs are categorised and used for root cause analysis',
        }
      ),
    },
  ].reduce((acc, field) => {
    const savedValue = uiSettings.get<string>(field.id, field.defaultValue);

    const fieldDef = {
      // defaults
      isCustom: false,
      isDefaultValue: false,
      isOverridden: false,
      unsavedFieldId: field.id,
      ariaAttributes: {
        ariaLabel: field.displayName,
      },
      defaultValueDisplay: field.defaultValueDisplay ?? field.defaultValue,
      ...field,
      savedValue,
    } as FieldDefinition;

    return {
      ...acc,
      [field.id]: fieldDef,
    };
  }, {});
}
