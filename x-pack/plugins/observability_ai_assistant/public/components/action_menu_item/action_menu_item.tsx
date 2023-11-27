/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { AssistantAvatar } from '../assistant_avatar';
import { ChatFlyout } from '../chat/chat_flyout';

export function ObservabilityAIAssistantActionMenuItem() {
  const service = useObservabilityAIAssistant();

  const [isOpen, setIsOpen] = useState(false);

  const chatService = useAbortableAsync(
    ({ signal }) => {
      if (!isOpen) {
        return Promise.resolve(undefined);
      }
      return service.start({ signal });
    },
    [service, isOpen]
  );

  const initialMessages = useMemo(() => [], []);

  if (!service.isEnabled()) {
    return null;
  }

  return (
    <>
      <EuiHeaderLink
        color="primary"
        data-test-subj="observabilityAiAssistantNewChatHeaderLink"
        onClick={() => {
          setIsOpen(() => true);
        }}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            {!isOpen || chatService.value ? (
              <AssistantAvatar size="xs" />
            ) : (
              <EuiLoadingSpinner size="s" />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.observabilityAiAssistant.actionMenuItemLabel', {
              defaultMessage: 'AI Assistant',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiHeaderLink>
      {chatService.value ? (
        <ObservabilityAIAssistantChatServiceProvider value={chatService.value}>
          <ChatFlyout
            initialTitle=""
            initialMessages={initialMessages}
            isOpen={isOpen}
            startedFrom="appTopNavbar"
            onClose={() => {
              setIsOpen(false);
            }}
          />
        </ObservabilityAIAssistantChatServiceProvider>
      ) : null}
    </>
  );
}
