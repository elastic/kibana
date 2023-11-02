/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { Conversation } from '@kbn/elastic-assistant';
import { AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { useAssistantTelemetry } from './use_assistant_telemetry';
import { getComments } from './get_comments';
import { augmentMessageCodeBlocks, LOCAL_STORAGE_KEY } from './helpers';
import { DEFAULT_ALLOW, DEFAULT_ALLOW_REPLACEMENT } from './content/anonymization';
import { PROMPT_CONTEXTS } from './content/prompt_contexts';
import { BASE_SECURITY_QUICK_PROMPTS } from './content/quick_prompts';
import { BASE_SECURITY_SYSTEM_PROMPTS } from './content/prompts/system';
import { useAnonymizationStore } from './use_anonymization_store';
import { useAssistantAvailability } from './use_assistant_availability';
import { APP_ID } from '../../common/constants';
import { useBasePath, useKibana } from '../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { useConversationStore } from './use_conversation_store';
import type { IsValidConversationId } from '../contract_assistant_conversation';

const ASSISTANT_TITLE = i18n.translate('xpack.securitySolution.assistant.title', {
  defaultMessage: 'Elastic AI Assistant',
});

export const AssistantConversationsProvider: React.FC<{
  assistantBaseConversations: Record<string, Conversation>;
  children: React.ReactNode;
  isValidConversationId: IsValidConversationId;
}> = ({ assistantBaseConversations, children, isValidConversationId }) => {
  const { conversations, setConversations } = useConversationStore(assistantBaseConversations);

  const {
    http,
    triggersActionsUi: { actionTypeRegistry },
    docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  } = useKibana().services;
  const basePath = useBasePath();
  const isModelEvaluationEnabled = useIsExperimentalFeatureEnabled('assistantModelEvaluation');
  const getInitialConversation = useCallback(() => {
    return conversations;
  }, [conversations]);

  const assistantAvailability = useAssistantAvailability();
  const assistantTelemetry = useAssistantTelemetry(assistantBaseConversations);

  const { defaultAllow, defaultAllowReplacement, setDefaultAllow, setDefaultAllowReplacement } =
    useAnonymizationStore();

  const nameSpace = `${APP_ID}.${LOCAL_STORAGE_KEY}`;

  return (
    <ElasticAssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      augmentMessageCodeBlocks={augmentMessageCodeBlocks}
      assistantAvailability={assistantAvailability}
      assistantBaseConversations={assistantBaseConversations}
      assistantTelemetry={assistantTelemetry}
      defaultAllow={defaultAllow}
      defaultAllowReplacement={defaultAllowReplacement}
      docLinks={{ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }}
      baseAllow={DEFAULT_ALLOW}
      baseAllowReplacement={DEFAULT_ALLOW_REPLACEMENT}
      basePath={basePath}
      basePromptContexts={Object.values(PROMPT_CONTEXTS)}
      baseQuickPrompts={BASE_SECURITY_QUICK_PROMPTS}
      baseSystemPrompts={BASE_SECURITY_SYSTEM_PROMPTS}
      getInitialConversations={getInitialConversation}
      getComments={getComments}
      http={http}
      isValidConversationId={isValidConversationId}
      modelEvaluatorEnabled={isModelEvaluationEnabled}
      nameSpace={nameSpace}
      setConversations={setConversations}
      setDefaultAllow={setDefaultAllow}
      setDefaultAllowReplacement={setDefaultAllowReplacement}
      title={ASSISTANT_TITLE}
    >
      {children}
    </ElasticAssistantProvider>
  );
};
