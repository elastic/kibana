/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
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
      isResized: boolean;
    };

export interface ChatApi {
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

const MESSAGE_WIDGET_READY = 'driftWidgetReady';
const MESSAGE_IFRAME_READY = 'driftIframeReady';
const MESSAGE_RESIZE = 'driftIframeResize';
const MESSAGE_SET_CONTEXT = 'driftSetContext';
const MESSAGE_CHAT_CLOSED = 'driftChatClosed';
const MESSAGE_PLAYBOOK_FIRED = 'driftPlaybookFired';

type ChatConfigParams = Exclude<ChatProps, 'onHide'> & {
  /** if the chat visibility is controlled from the outside */
  controlled?: boolean;
};

/**
 * Hook which handles positioning and communication with the chat widget.
 */
export const useChatConfig = ({
  onReady = () => {},
  onResize = () => {},
  onPlaybookFired = () => {},
  controlled = true,
}: ChatConfigParams): UseChatType => {
  const ref = useRef<HTMLIFrameElement>(null);
  const chat = useChat();
  const [style, setStyle] = useState<CSSProperties>({ height: 0, width: 0 });
  const [isReady, setIsReady] = useState(false);
  const [isResized, setIsResized] = useState(false);
  const isChatOpenRef = useRef<boolean>(false);
  const [hasPlaybookFiredOnce, setPlaybookFiredOnce] = useLocalStorage(
    'cloudChatPlaybookFiredOnce',
    false
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const { current: chatIframe } = ref;

      if (!chat || !chatIframe?.contentWindow || event.source !== chatIframe?.contentWindow) {
        return;
      }

      const context = getChatContext();
      const { data: message } = event;
      const { user: userConfig, chatVariant } = chat;
      const { id, email, jwt, trialEndDate, kbnVersion, kbnBuildNum } = userConfig;

      const chatApi: ChatApi = {
        show: () => {
          ref.current?.contentWindow?.postMessage(
            {
              type: `driftShow`,
            },
            '*'
          );
          ref.current?.contentWindow?.postMessage(
            {
              type: `driftOpenChat`,
            },
            '*'
          );
          isChatOpenRef.current = true;
        },
        hide: () => {
          ref.current?.contentWindow?.postMessage(
            {
              type: `driftHide`,
            },
            '*'
          );
          isChatOpenRef.current = false;
        },
        toggle: () => {
          if (isChatOpenRef.current) {
            chatApi.hide();
          } else {
            chatApi.show();
          }
        },
      };

      switch (message.type) {
        // The IFRAME is ready to receive messages.
        case MESSAGE_IFRAME_READY: {
          const user = {
            id,
            attributes: {
              email,
              trial_end_date: trialEndDate,
              kbn_version: kbnVersion,
              kbn_build_num: kbnBuildNum,
              kbn_chat_variant: chatVariant,
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
          // camelize to avoid style warnings from react
          const camelize = (s: string) => s.replace(/-./g, (x) => x[1].toUpperCase());
          const camelStyles = Object.keys(styles).reduce((acc, key) => {
            acc[camelize(key)] = styles[key];
            return acc;
          }, {} as Record<string, string>) as CSSProperties;
          setStyle({ ...style, ...camelStyles });

          if (!isResized) {
            setIsResized(true);
          }

          onResize();
          break;
        }

        // The chat widget is ready.
        case MESSAGE_WIDGET_READY:
          if (controlled) chatApi.hide();

          setIsReady(true);
          onReady(chatApi);

          if (hasPlaybookFiredOnce) {
            // The `MESSAGE_PLAYBOOK_FIRED` event is only fired until the interaction,
            // so we need to manually trigger the callback if the event has already fired.
            // otherwise, users might have an ongoing conversion, but they can't get back to it
            onPlaybookFired();
          }
          break;

        case MESSAGE_CHAT_CLOSED:
          if (controlled) chatApi.hide();
          break;

        case MESSAGE_PLAYBOOK_FIRED:
          onPlaybookFired();
          setPlaybookFiredOnce(true);
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [
    chat,
    style,
    onReady,
    onResize,
    isReady,
    isResized,
    controlled,
    hasPlaybookFiredOnce,
    onPlaybookFired,
    setPlaybookFiredOnce,
  ]);

  if (chat) {
    return {
      enabled: true,
      src: chat.chatURL,
      ref,
      style,
      isReady,
      isResized,
    };
  }

  return { enabled: false };
};
