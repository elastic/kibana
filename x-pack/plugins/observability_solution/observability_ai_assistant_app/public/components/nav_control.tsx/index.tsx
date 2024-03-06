/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AssistantAvatar, useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { v4 } from 'uuid';
import useObservable from 'react-use/lib/useObservable';
import { useObservabilityAIAssistantAppService } from '../../hooks/use_observability_ai_assistant_app_service';
import { ChatFlyout } from '../chat/chat_flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useIsNavControlVisible } from '../../hooks/is_nav_control_visible';

const buttonCss = css`
  padding: 4px 2px 0 2px;
  & svg circle {
    opacity: 0.85;
  }
  &:hover svg circle {
    opacity: 1;
  }
`;

export function NavControl({}: {}) {
  const service = useObservabilityAIAssistantAppService();

  const {
    services: {
      plugins: {
        start: {
          observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
        },
      },
    },
  } = useKibana();

  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return hasBeenOpened ? service.start({ signal }) : undefined;
    },
    [service, hasBeenOpened]
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

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        css={buttonCss}
        onClick={() => {
          service.conversations.openNewConversation({
            messages: [],
          });
        }}
      >
        <AssistantAvatar size="s" background />
      </EuiButtonEmpty>
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
            startedFrom="appTopNavbar"
          />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : undefined}
    </>
  );
}
