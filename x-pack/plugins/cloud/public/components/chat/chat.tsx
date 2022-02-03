/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
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

const CSS_BOTTOM = 30;
const CSS_RIGHT = 30;

// This value comes from $euiZNavigation and $euiZMask, which are not yet codified in
// the EUI Emotion theme.
const CSS_Z_INDEX = 5999;
const CSS_BUFFER = 4;

const MESSAGE_WIDGET_READY = 'driftWidgetReady';
const MESSAGE_IFRAME_READY = 'driftIframeReady';
const MESSAGE_RESIZE = 'driftIframeResize';
const MESSAGE_SET_CONTEXT = 'driftSetContext';

type ChatConfigParams = Exclude<Props, 'onHide'>;

const useChatConfig = ({
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

        case MESSAGE_RESIZE: {
          const styles = message.data.styles || ({} as CSSProperties);
          setStyle({ ...style, ...styles });
          setIsReady(true);
          onResize();
          break;
        }

        case MESSAGE_WIDGET_READY: {
          onReady();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [chat, style, onReady, onResize]);

  if (chat.enabled) {
    return { enabled: true, src: chat.chatURL, ref, style, isReady };
  }

  return { enabled: false };
};

export interface Props {
  /** Handler invoked when chat is hidden by someone. */
  onHide?: () => void;
  /** Handler invoked when the chat widget signals it is ready. */
  onReady?: () => void;
  /** Handler invoked when the chat widget signals to be resized. */
  onResize?: () => void;
}

/**
 * A component that will display a trigger that will allow the user to chat with a human operator,
 * when the service is enabled; otherwise, it renders nothing.
 */
export const Chat = ({ onHide = () => {}, onReady, onResize }: Props) => {
  const config = useChatConfig({ onReady, onResize });
  const ref = useRef<HTMLDivElement>(null);
  const [isClosed, setIsClosed] = useState(false);

  if (!config.enabled || isClosed) {
    return null;
  }

  let button = null;

  if (config.isReady && config.style) {
    const bottom = parseInt(config.style.bottom as string, 10);
    const height = parseInt(config.style.height as string, 10);
    const right = parseInt(config.style.right as string, 10);

    const buttonCSS = css`
      position: fixed;
      bottom: ${bottom + height}px;
      right: ${right + CSS_BUFFER}px;
      visibility: hidden;
    `;

    button = (
      <EuiButtonEmpty
        css={buttonCSS}
        onClick={() => {
          setIsClosed(true);
          onHide();
        }}
        size="xs"
        name="chat-close"
        data-test-subj="cloud-chat-hide"
      >
        {i18n.translate('xpack.cloud.chat.hideChatButtonLabel', {
          defaultMessage: 'Hide chat',
        })}
      </EuiButtonEmpty>
    );
  }

  const containerCSS = css`
    position: fixed;
    bottom: ${CSS_BOTTOM}px;
    right: ${CSS_RIGHT}px;
    visibility: ${config.isReady ? 'visible' : 'hidden'};
    z-index: ${CSS_Z_INDEX};

    &:hover [name='chat-close'] {
      visibility: visible;
    }
  `;

  return (
    <div css={containerCSS} ref={ref}>
      {button}
      <iframe
        data-test-subj="floatingChatTrigger"
        title={i18n.translate('xpack.cloud.chat.chatFrameTitle', {
          defaultMessage: 'Chat',
        })}
        {...config}
      />
    </div>
  );
};
