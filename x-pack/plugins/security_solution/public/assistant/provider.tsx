/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import { parse } from '@kbn/datemath';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import type { IToasts, NotificationsStart } from '@kbn/core-notifications-browser';
import type { Conversation } from '@kbn/elastic-assistant';
import {
  AssistantProvider as ElasticAssistantProvider,
  bulkUpdateConversations,
  getUserConversations,
} from '@kbn/elastic-assistant';

import { once } from 'lodash/fp';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { Message } from '@kbn/elastic-assistant-common';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { APP_ID } from '../../common';
import { useBasePath, useKibana } from '../common/lib/kibana';
import { useAssistantTelemetry } from './use_assistant_telemetry';
import { getComments } from './get_comments';
import { LOCAL_STORAGE_KEY, augmentMessageCodeBlocks } from './helpers';
import { useBaseConversations } from './use_conversation_store';
import { PROMPT_CONTEXTS } from './content/prompt_contexts';
import { BASE_SECURITY_QUICK_PROMPTS } from './content/quick_prompts';
import { BASE_SECURITY_SYSTEM_PROMPTS } from './content/prompts/system';
import { useAssistantAvailability } from './use_assistant_availability';
import { useAppToasts } from '../common/hooks/use_app_toasts';
import { useSignalIndex } from '../detections/containers/detection_engine/alerts/use_signal_index';

const ASSISTANT_TITLE = i18n.translate('xpack.securitySolution.assistant.title', {
  defaultMessage: 'Elastic AI Assistant',
});

const LOCAL_CONVERSATIONS_MIGRATION_STATUS_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.conversationMigrationStatus.title',
  {
    defaultMessage: 'Local storage conversations persisted successfuly.',
  }
);

export const createConversations = async (
  notifications: NotificationsStart,
  http: HttpSetup,
  storage: Storage
) => {
  // migrate conversations with messages from the local storage
  // won't happen next time
  const conversations = storage.get(`${APP_ID}.${LOCAL_STORAGE_KEY}`);

  if (conversations && Object.keys(conversations).length > 0) {
    const conversationsToCreate = Object.values(conversations).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c.messages && c.messages.length > 0
    );

    const transformMessage = (m: Message) => {
      const timestamp = parse(m.timestamp ?? '')?.toISOString();
      return {
        ...m,
        timestamp: timestamp == null ? new Date().toISOString() : timestamp,
      };
    };
    const connectors = await loadConnectors({ http });

    // post bulk create
    const bulkResult = await bulkUpdateConversations(
      http,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: conversationsToCreate.reduce((res: Record<string, Conversation>, c: any) => {
          // ensure actionTypeId is added to apiConfig from legacy conversation data
          if (c.apiConfig && !c.apiConfig.actionTypeId) {
            const selectedConnector = (connectors ?? []).find(
              (connector) => connector.id === c.apiConfig.connectorId
            );
            if (selectedConnector) {
              c.apiConfig = {
                ...c.apiConfig,
                actionTypeId: selectedConnector.actionTypeId,
              };
            } else {
              c.apiConfig = undefined;
            }
          }
          res[c.id] = {
            ...c,
            messages: (c.messages ?? []).map(transformMessage),
            title: c.id,
            replacements: c.replacements,
          };
          return res;
        }, {}),
      },
      notifications.toasts
    );
    if (bulkResult && bulkResult.success) {
      storage.remove(`${APP_ID}.${LOCAL_STORAGE_KEY}`);
      notifications.toasts?.addSuccess({
        iconType: 'check',
        title: LOCAL_CONVERSATIONS_MIGRATION_STATUS_TOAST_TITLE,
      });
      return true;
    }
    return false;
  }
};

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export const AssistantProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const {
    http,
    notifications,
    storage,
    triggersActionsUi: { actionTypeRegistry },
    docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  } = useKibana().services;
  const basePath = useBasePath();

  const baseConversations = useBaseConversations();
  const assistantAvailability = useAssistantAvailability();
  const assistantTelemetry = useAssistantTelemetry();

  useEffect(() => {
    const migrateConversationsFromLocalStorage = once(async () => {
      const res = await getUserConversations({
        http,
      });
      if (
        assistantAvailability.isAssistantEnabled &&
        assistantAvailability.hasAssistantPrivilege &&
        res.total === 0
      ) {
        await createConversations(notifications, http, storage);
      }
    });
    migrateConversationsFromLocalStorage();
  }, [
    assistantAvailability.hasAssistantPrivilege,
    assistantAvailability.isAssistantEnabled,
    http,
    notifications,
    storage,
  ]);

  const { signalIndexName } = useSignalIndex();
  const alertsIndexPattern = signalIndexName ?? undefined;
  const toasts = useAppToasts() as unknown as IToasts; // useAppToasts is the current, non-deprecated method of getting the toasts service in the Security Solution, but it doesn't return the IToasts interface (defined by core)

  return (
    <ElasticAssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      alertsIndexPattern={alertsIndexPattern}
      augmentMessageCodeBlocks={augmentMessageCodeBlocks}
      assistantAvailability={assistantAvailability}
      assistantTelemetry={assistantTelemetry}
      docLinks={{ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }}
      basePath={basePath}
      basePromptContexts={Object.values(PROMPT_CONTEXTS)}
      baseQuickPrompts={BASE_SECURITY_QUICK_PROMPTS} // to server and plugin start
      baseSystemPrompts={BASE_SECURITY_SYSTEM_PROMPTS} // to server and plugin start
      baseConversations={baseConversations}
      getComments={getComments}
      http={http}
      title={ASSISTANT_TITLE}
      toasts={toasts}
    >
      {children}
    </ElasticAssistantProvider>
  );
};
