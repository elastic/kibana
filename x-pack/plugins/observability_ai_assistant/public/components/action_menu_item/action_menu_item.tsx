/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiLoadingSpinner } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useKibana } from '../../hooks/use_kibana';
import { AssistantAvatar } from '../assistant_avatar';
import { ChatFlyout, FlyoutPositionMode } from '../chat/chat_flyout';

export function ObservabilityAIAssistantActionMenuItem() {
  const service = useObservabilityAIAssistant();
  const {
    plugins: {
      start: {
        data: {
          query: {
            timefilter: { timefilter },
          },
        },
      },
    },
  } = useKibana().services;

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

  const [conversationId, setConversationId, removeConversationId] = useLocalStorage(
    'observabilityAIAssistant_conversationId',
    ''
  );
  const [flyoutMode, setFlyoutMode] = useLocalStorage('observabilityAIAssistant_flyoutMode', '');

  useEffect(() => {
    if (conversationId) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { from, to } = timefilter.getTime();

  useEffect(() => {
    const start = datemath.parse(from)?.format() ?? moment().subtract(1, 'day').toISOString();
    const end = datemath.parse(to)?.format() ?? moment().toISOString();

    return service.setScreenContext({
      screenDescription: `The user is looking at ${window.location.href}. The current time range is ${start} - ${end}.`,
    });
  }, [service, from, to]);

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

  return service.isEnabled() ? (
    <>
      <EuiHeaderLink
        color="primary"
        data-test-subj="observabilityAiAssistantNewChatHeaderLink"
        disabled={chatService.loading}
        onClick={() => {
          setIsOpen(() => true);
        }}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            {isOpen && !chatService.value ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <AssistantAvatar size="xs" />
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
            initialConversationId={conversationId || ''}
            initialTitle=""
            initialMessages={[]}
            initialFlyoutPositionMode={flyoutMode as FlyoutPositionMode}
            isOpen={isOpen}
            startedFrom="appTopNavbar"
            onClose={() => {
              setIsOpen(false);
              removeConversationId();
            }}
            onSelectConversation={(newConversationId) => {
              setConversationId(newConversationId);
            }}
            onSetFlyoutPositionMode={setFlyoutMode}
          />
        </ObservabilityAIAssistantChatServiceProvider>
      ) : null}
    </>
  ) : null;
}
