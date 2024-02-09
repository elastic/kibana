/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Semicolon') {
        setIsOpen(true);
      }
    };

    window.addEventListener('keypress', keyboardListener);

    return () => {
      window.removeEventListener('keypress', keyboardListener);
    };
  }, []);

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
              <EuiLoadingSpinner size="m" />
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
