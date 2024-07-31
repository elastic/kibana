/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewChat, AssistantAvatar } from '@kbn/elastic-assistant';

import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import * as i18nAssistant from '../../../../detections/pages/detection_engine/rules/translations';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import type { FormHook, ValidationError } from '../../../../shared_imports';

import * as i18n from './translations';

const getLanguageName = (language: string | undefined) => {
  let modifiedLanguage = language;
  if (language === 'eql') {
    modifiedLanguage = 'EQL(Event Query Language)';
  }
  if (language === 'esql') {
    modifiedLanguage = 'ES|QL(The Elasticsearch Query Language)';
  }

  return modifiedLanguage;
};

const retrieveErrorMessages = (errors: ValidationError[]): string =>
  errors
    .flatMap(({ message, messages }) => [message, ...(Array.isArray(messages) ? messages : [])])
    .join(', ');

interface AiAssistantProps {
  getFields: FormHook<DefineStepRule>['getFields'];
  language?: string | undefined;
}

const AiAssistantComponent: React.FC<AiAssistantProps> = ({ getFields, language }) => {
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();

  const languageName = getLanguageName(language);

  const getPromptContext = useCallback(async () => {
    const queryField = getFields().queryBar;
    const { query } = (queryField.value as DefineStepRule['queryBar']).query;

    if (!query) {
      return '';
    }

    if (queryField.errors.length === 0) {
      return `No errors in ${languageName} language query detected. Current query: ${query.trim()}`;
    }

    return `${languageName} language query written for Elastic Security Detection rules: \"${query.trim()}\"
returns validation error on form: \"${retrieveErrorMessages(queryField.errors)}\"
Fix ${languageName} language query and give an example of it in markdown format that can be copied.
Proposed solution should be valid and must not contain new line symbols (\\n)`;
  }, [getFields, languageName]);

  const onShowOverlay = useCallback(() => {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.OPEN_ASSISTANT_ON_RULE_QUERY_ERROR);
  }, []);

  if (!hasAssistantPrivilege) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />

      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.askAssistantHelpText"
        defaultMessage="{AiAssistantNewChatLink} to help resolve this error."
        values={{
          AiAssistantNewChatLink: (
            <NewChat
              asLink={true}
              category="detection-rules"
              conversationId={i18nAssistant.DETECTION_RULES_CONVERSATION_ID}
              description={i18n.ASK_ASSISTANT_DESCRIPTION}
              getPromptContext={getPromptContext}
              suggestedUserPrompt={i18n.ASK_ASSISTANT_USER_PROMPT(languageName)}
              tooltip={i18n.ASK_ASSISTANT_TOOLTIP}
              iconType={null}
              onShowOverlay={onShowOverlay}
              isAssistantEnabled={isAssistantEnabled}
            >
              <AssistantAvatar size="xxs" /> {i18n.ASK_ASSISTANT_ERROR_BUTTON}
            </NewChat>
          ),
        }}
      />
    </>
  );
};

export const AiAssistant = React.memo(AiAssistantComponent);
AiAssistant.displayName = 'AiAssistant';
