/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { NewChat } from '@kbn/elastic-assistant';

import * as i18n from './translations';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import * as i18nAssistant from '../../../../detections/pages/detection_engine/rules/translations';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import type { FormHook } from '../../../../shared_imports';

interface AiAssistantProps {
  form: FormHook<DefineStepRule>;
}

const AiAssistantComponent: React.FC<AiAssistantProps> = ({ form }) => {
  const { hasAssistantPrivilege } = useAssistantAvailability();

  const getPromptContext = async () => {
    const queryField = form.getFields().queryBar;
    const esqlQuery = (queryField.value as DefineStepRule['queryBar'])?.query?.query;

    if (!esqlQuery) {
      return '';
    }

    if (queryField.errors.length === 0) {
      return `No errors in ES|QL query detected. Current ES|QL query: ${esqlQuery}`;
    }

    return `ES|QL query written for Elastic Security Detection rules: ${esqlQuery}
    returns validation error on form: ${queryField.errors.map((error) => error.message).join(', ')}
    Fix ES|QL query and give an example of it in markdown format that can be copied.
    Ensure query is valid and doesn't contain new line symbols
    `;
  };

  if (!hasAssistantPrivilege) {
    return null;
  }

  return (
    <NewChat
      category="detection-rules"
      conversationId={i18nAssistant.DETECTION_RULES_CONVERSATION_ID}
      description={i18n.ASK_ASSISTANT_DESCRIPTION}
      getPromptContext={getPromptContext}
      suggestedUserPrompt={i18n.ASK_ASSISTANT_USER_PROMPT}
      tooltip={i18n.ASK_ASSISTANT_TOOLTIP}
    >
      {i18n.ASK_ASSISTANT_ERROR_BUTTON}
    </NewChat>
  );
};

export const AiAssistant = React.memo(AiAssistantComponent);
AiAssistant.displayName = 'AiAssistant';
