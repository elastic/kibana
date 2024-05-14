/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { NewChat, AssistantAvatar } from '@kbn/elastic-assistant';
import { css } from '@emotion/css';

import * as i18n from './translations';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import * as i18nAssistant from '../../../../detections/pages/detection_engine/rules/translations';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import type { FormHook, ValidationError } from '../../../../shared_imports';

interface AiAssistantProps {
  form: FormHook<DefineStepRule>;
}

const retrieveErrorMessages = (errors: ValidationError[]): string =>
  errors
    .flatMap(({ message, messages }) => [message, ...(Array.isArray(messages) ? messages : [])])
    .join(', ');

const AiAssistantComponent: React.FC<AiAssistantProps> = ({ form }) => {
  const { hasAssistantPrivilege } = useAssistantAvailability();

  const getPromptContext = async () => {
    const queryField = form.getFields().queryBar;
    const { query, language } = (queryField.value as DefineStepRule['queryBar']).query;

    if (!query) {
      return '';
    }

    if (queryField.errors.length === 0) {
      return `No errors in ${language} language query detected. Current query: ${query.trim()}`;
    }

    return `${language} language query written for Elastic Security Detection rules: \"${query.trim()}\"
returns validation error on form: \"${retrieveErrorMessages(queryField.errors)}\"
Fix ${language} language query and give an example of it in markdown format that can be copied.
Proposed solution should be valid and must not contain new line symbols (\\n)`;
  };

  if (!hasAssistantPrivilege) {
    return null;
  }

  return (
    <>
      <NewChat
        category="detection-rules"
        conversationId={i18nAssistant.DETECTION_RULES_CONVERSATION_ID}
        description={i18n.ASK_ASSISTANT_DESCRIPTION}
        getPromptContext={getPromptContext}
        suggestedUserPrompt={i18n.ASK_ASSISTANT_USER_PROMPT}
        tooltip={i18n.ASK_ASSISTANT_TOOLTIP}
        iconType={null}
      >
        <AssistantAvatar
          size="xxs"
          css={css`
            margin-right: 10px;
          `}
        />
        {i18n.ASK_ASSISTANT_ERROR_BUTTON}
      </NewChat>
      <span
        css={css`
          vertical-align: middle;
        `}
      >
        {'to help resolve this error.'}
      </span>
    </>
  );
};

export const AiAssistant = React.memo(AiAssistantComponent);
AiAssistant.displayName = 'AiAssistant';
