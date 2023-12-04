/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';
import { useBasePath, useKibana } from '../common/lib/kibana';
import { useAssistantTelemetry } from './use_assistant_telemetry';
import { getComments } from './get_comments';
import { augmentMessageCodeBlocks, LOCAL_STORAGE_KEY } from './helpers';
import { useConversationStore } from './use_conversation_store';
import { DEFAULT_ALLOW, DEFAULT_ALLOW_REPLACEMENT } from './content/anonymization';
import { PROMPT_CONTEXTS } from './content/prompt_contexts';
import { BASE_SECURITY_QUICK_PROMPTS } from './content/quick_prompts';
import { BASE_SECURITY_SYSTEM_PROMPTS } from './content/prompts/system';
import { useAnonymizationStore } from './use_anonymization_store';
import { useAssistantAvailability } from './use_assistant_availability';
import { APP_ID } from '../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';

const ASSISTANT_TITLE = i18n.translate('xpack.securitySolution.assistant.title', {
  defaultMessage: 'Elastic AI Assistant',
});

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export const AssistantProvider: React.FC = ({ children }) => {
  const {
    http,
    triggersActionsUi: { actionTypeRegistry },
    docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  } = useKibana().services;
  const basePath = useBasePath();
  const isModelEvaluationEnabled = useIsExperimentalFeatureEnabled('assistantModelEvaluation');
  const assistantStreamingEnabled = useIsExperimentalFeatureEnabled('assistantStreamingEnabled');

  const { conversations, setConversations } = useConversationStore();
  const getInitialConversation = useCallback(() => {
    return conversations;
  }, [conversations]);

  const assistantAvailability = useAssistantAvailability();
  const assistantTelemetry = useAssistantTelemetry();

  const { defaultAllow, defaultAllowReplacement, setDefaultAllow, setDefaultAllowReplacement } =
    useAnonymizationStore();

  const nameSpace = `${APP_ID}.${LOCAL_STORAGE_KEY}`;

  return (
    <ElasticAssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      augmentMessageCodeBlocks={augmentMessageCodeBlocks}
      assistantAvailability={assistantAvailability}
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
      assistantStreamingEnabled={assistantStreamingEnabled}
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
