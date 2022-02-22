/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { useChat } from '../../services';
import { getChatContext } from './get_chat_context';
import { Props as ChatProps } from './chat';

type UseChatType =
  | { enabled: false }
  | {
      enabled: true;
      src: string;
      ref: React.MutableRefObject<HTMLIFrameElement | null>;
      style: CSSProperties;
      isReady: boolean;
    };

const MESSAGE_WIDGET_READY = 'driftWidgetReady';
const MESSAGE_IFRAME_READY = 'driftIframeReady';
const MESSAGE_RESIZE = 'driftIframeResize';
const MESSAGE_SET_CONTEXT = 'driftSetContext';

type ChatConfigParams = Exclude<ChatProps, 'onHide'>;

/**
 * Hook which handles positioning and communication with the chat widget.
 */
export const useChatConfig = ({
  onReady = () => {},
  onResize = () => {},
}: ChatConfigParams): UseChatType => {
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
        // The IFRAME is ready to receive messages.
        case MESSAGE_IFRAME_READY: {
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

          break;
        }

        // Drift is attempting to resize the IFRAME based on interactions with
        // its interface.
        case MESSAGE_RESIZE: {
          const styles = message.data.styles || ({} as CSSProperties);
          setStyle({ ...style, ...styles });

          // While it might appear we should set this when we receive MESSAGE_WIDGET_READY,
          // we need to wait for the iframe to be resized the first time before it's considered
          // *visibly* ready.
          if (!isReady) {
            setIsReady(true);
            onReady();
          }

          onResize();
          break;
        }

        // The chat widget is ready.
        case MESSAGE_WIDGET_READY:
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [chat, style, onReady, onResize, isReady]);

  if (chat.enabled) {
    return { enabled: true, src: chat.chatURL, ref, style, isReady };
  }

  return { enabled: false };
};
