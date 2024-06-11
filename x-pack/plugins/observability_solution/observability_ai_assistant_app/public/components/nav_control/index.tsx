/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AssistantAvatar, useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiButton, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { useObservabilityAIAssistantAppService } from '../../hooks/use_observability_ai_assistant_app_service';
import { ChatFlyout } from '../chat/chat_flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useIsNavControlVisible } from '../../hooks/is_nav_control_visible';
import { useTheme } from '../../hooks/use_theme';
import { useNavControlScreenContext } from '../../hooks/use_nav_control_screen_context';

export function NavControl({}: {}) {
  const service = useObservabilityAIAssistantAppService();

  const {
    services: {
      notifications,
      plugins: {
        start: {
          observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
        },
      },
    },
  } = useKibana();

  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useNavControlScreenContext();

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return hasBeenOpened
        ? service.start({ signal }).catch((error) => {
            notifications.toasts.addError(error, {
              title: i18n.translate(
                'xpack.observabilityAiAssistant.navControl.initFailureErrorTitle',
                {
                  defaultMessage: 'Failed to initialize Observability AI Assistant',
                }
              ),
            });

            setHasBeenOpened(false);
            setIsOpen(false);

            throw error;
          })
        : undefined;
    },
    [service, hasBeenOpened, notifications.toasts]
  );

  const [isOpen, setIsOpen] = useState(false);

  const keyRef = useRef(v4());

  const { isVisible } = useIsNavControlVisible();

  useEffect(() => {
    const conversationSubscription = service.conversations.predefinedConversation$.subscribe(() => {
      setHasBeenOpened(true);
      setIsOpen(true);
    });

    return () => {
      conversationSubscription.unsubscribe();
    };
  }, [service.conversations.predefinedConversation$]);

  const { messages, title } = useObservable(service.conversations.predefinedConversation$) ?? {
    messages: [],
    title: undefined,
  };

  const theme = useTheme();

  const buttonCss = css`
    padding: 0px 8px;

    svg path {
      fill: ${theme.colors.darkestShade};
    }
  `;

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Semicolon') {
        service.conversations.openNewConversation({
          messages: [],
        });
      }
    };

    window.addEventListener('keypress', keyboardListener);

    return () => {
      window.removeEventListener('keypress', keyboardListener);
    };
  }, [service.conversations]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <EuiToolTip content={buttonLabel}>
        <EuiButton
          aria-label={buttonLabel}
          data-test-subj="observabilityAiAssistantAppNavControlButton"
          css={buttonCss}
          onClick={() => {
            service.conversations.openNewConversation({
              messages: [],
            });
          }}
          color="primary"
          size="s"
          fullWidth={false}
          minWidth={0}
        >
          {chatService.loading ? <EuiLoadingSpinner size="s" /> : <AssistantAvatar size="xs" />}
        </EuiButton>
      </EuiToolTip>
      {chatService.value ? (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value}>
          <ChatFlyout
            key={keyRef.current}
            isOpen={isOpen}
            initialMessages={messages}
            initialTitle={title ?? ''}
            onClose={() => {
              setIsOpen(false);
            }}
          />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : undefined}
    </>
  );
}

const buttonLabel = i18n.translate(
  'xpack.observabilityAiAssistant.navControl.openTheAIAssistantPopoverLabel',
  { defaultMessage: 'Open the AI Assistant' }
);
