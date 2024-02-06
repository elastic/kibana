/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { Conversation } from '@kbn/elastic-assistant';
import {
  AssistantProvider as ElasticAssistantProvider,
  bulkChangeConversations,
  mergeBaseWithPersistedConversations,
  useFetchCurrentUserConversations,
} from '@kbn/elastic-assistant';

import type { FetchConversationsResponse } from '@kbn/elastic-assistant/impl/assistant/api';
import { useBasePath, useKibana } from '../common/lib/kibana';
import { useAssistantTelemetry } from './use_assistant_telemetry';
import { getComments } from './get_comments';
import { LOCAL_STORAGE_KEY, augmentMessageCodeBlocks } from './helpers';
import { useBaseConversations } from './use_conversation_store';
import { DEFAULT_ALLOW, DEFAULT_ALLOW_REPLACEMENT } from './content/anonymization';
import { PROMPT_CONTEXTS } from './content/prompt_contexts';
import { BASE_SECURITY_QUICK_PROMPTS } from './content/quick_prompts';
import { BASE_SECURITY_SYSTEM_PROMPTS } from './content/prompts/system';
import { useAnonymizationStore } from './use_anonymization_store';
import { useAssistantAvailability } from './use_assistant_availability';
import { useAppToasts } from '../common/hooks/use_app_toasts';
import { useSignalIndex } from '../detections/containers/detection_engine/alerts/use_signal_index';

const ASSISTANT_TITLE = i18n.translate('xpack.securitySolution.assistant.title', {
  defaultMessage: 'Elastic AI Assistant',
});

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export const AssistantProvider: React.FC = ({ children }) => {
  const {
    http,
    storage,
    triggersActionsUi: { actionTypeRegistry },
    docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  } = useKibana().services;
  const basePath = useBasePath();

  const baseConversations = useBaseConversations();
  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations({}, conversationsData),
    []
  );
  const {
    data: conversationsData,
    isLoading,
    isError,
  } = useFetchCurrentUserConversations({ http, onFetch: onFetchedConversations });
  const assistantAvailability = useAssistantAvailability();
  const assistantTelemetry = useAssistantTelemetry();

  const { defaultAllow, defaultAllowReplacement, setDefaultAllow, setDefaultAllowReplacement } =
    useAnonymizationStore();

  const { signalIndexName } = useSignalIndex();
  const alertsIndexPattern = signalIndexName ?? undefined;
  const toasts = useAppToasts() as unknown as IToasts; // useAppToasts is the current, non-deprecated method of getting the toasts service in the Security Solution, but it doesn't return the IToasts interface (defined by core)

  // migrate conversations with messages from the local storage
  // won't happen again if the user conversations exist in the index
  const conversations = storage.get(`securitySolution.${LOCAL_STORAGE_KEY}`);

  useEffect(() => {
    const migrateConversationsFromLocalStorage = async () => {
      if (
        !isLoading &&
        !isError &&
        conversationsData &&
        Object.keys(conversationsData).length === 0 &&
        conversations &&
        Object.keys(conversations).length > 0
      ) {
        const conversationsToCreate = Object.values(
          conversations as Record<string, Conversation>
        ).filter((c) => c.messages && c.messages.length > 0);
        // post bulk create
        const bulkResult = await bulkChangeConversations(http, {
          create: conversationsToCreate.reduce((res: Record<string, Conversation>, c) => {
            res[c.id] = { ...c, title: c.id };
            return res;
          }, {}),
        });
        if (bulkResult && bulkResult.success) {
          storage.remove(`securitySolution.${LOCAL_STORAGE_KEY}`);
        }
      }
    };
    migrateConversationsFromLocalStorage();
  }, [conversations, conversationsData, http, isError, isLoading, storage]);

  return (
    <ElasticAssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      alertsIndexPattern={alertsIndexPattern}
      augmentMessageCodeBlocks={augmentMessageCodeBlocks}
      assistantAvailability={assistantAvailability}
      assistantTelemetry={assistantTelemetry}
      defaultAllow={defaultAllow} // to server and plugin start
      defaultAllowReplacement={defaultAllowReplacement} // to server and plugin start
      docLinks={{ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }}
      baseAllow={DEFAULT_ALLOW} // to server and plugin start
      baseAllowReplacement={DEFAULT_ALLOW_REPLACEMENT} // to server and plugin start
      basePath={basePath}
      basePromptContexts={Object.values(PROMPT_CONTEXTS)}
      baseQuickPrompts={BASE_SECURITY_QUICK_PROMPTS} // to server and plugin start
      baseSystemPrompts={BASE_SECURITY_SYSTEM_PROMPTS} // to server and plugin start
      baseConversations={baseConversations}
      getComments={getComments}
      http={http}
      setDefaultAllow={setDefaultAllow} // remove
      setDefaultAllowReplacement={setDefaultAllowReplacement} // remove
      title={ASSISTANT_TITLE}
      toasts={toasts}
    >
      {children}
    </ElasticAssistantProvider>
  );
};
