/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { css } from '@emotion/react';
import { useChat } from '../../services';
import { getChatContext } from './get_chat_context';

type UseChatType =
  | { enabled: false }
  | {
      enabled: true;
      src: string;
      ref: React.MutableRefObject<HTMLIFrameElement | null>;
      style: CSSProperties;
      isReady: boolean;
    };

const MESSAGE_READY = 'driftIframeReady';
const MESSAGE_RESIZE = 'driftIframeResize';
const MESSAGE_SET_CONTEXT = 'driftSetContext';

const useChatConfig = (): UseChatType => {
  const ref = useRef<HTMLIFrameElement>(null);
  const chat = useChat();
  const [style, setStyle] = useState<CSSProperties>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const { current: chatIframe } = ref;

      if (
        !chat.enabled ||
        !chatIframe?.contentWindow ||
        event.source !== chatIframe?.contentWindow
      ) {
        return;
      }

      const context = getChatContext();
      const { data: message } = event;
      const { user: userConfig } = chat;
      const { id, email, jwt } = userConfig;

      switch (message.type) {
        case MESSAGE_READY: {
          const user = {
            id,
            attributes: {
              email,
            },
            jwt,
          };

          chatIframe.contentWindow.postMessage(
            {
              type: MESSAGE_SET_CONTEXT,
              data: { context, user },
            },
            '*'
          );

          setIsReady(true);

          break;
        }

        case MESSAGE_RESIZE: {
          const styles = message.data.styles || ({} as CSSProperties);
          setStyle({ ...style, ...styles });
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [chat, style]);

  if (chat.enabled) {
    return { enabled: true, src: chat.chatURL, ref, style, isReady };
  }

  return { enabled: false };
};

export const Chat = () => {
  const config = useChatConfig();

  if (!config.enabled) {
    return null;
  }

  const iframeStyle = css`
    position: fixed;
    botton: 30px;
    right: 30px;
    visibility: ${config.isReady ? 'visible' : 'hidden'};
  `;

  return <iframe css={iframeStyle} data-test-subj="floatingChatTrigger" title="chat" {...config} />;
};
