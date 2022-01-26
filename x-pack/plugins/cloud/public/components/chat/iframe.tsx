/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { css } from '@emotion/react';
import { useChat } from '../../services';

type UseChatType =
  | { enabled: false }
  | {
      enabled: true;
      src: string;
      ref: React.MutableRefObject<HTMLIFrameElement | null>;
      style: CSSProperties;
    };

const MESSAGE_READY = 'driftIframeReady';
const MESSAGE_RESIZE = 'driftIframeResize';
const MESSAGE_SET_CONTEXT = 'driftSetContext';

const iframeStyle = css`
  position: fixed;
  botton: 30px;
  right: 30px;
  display: block;
`;

// We're sending a lot of information to the frame, so this method puts together the specific
// properties, 1/ to avoid leaking too much, and 2/ to enumerate precisely what we're sending.
const getContext = () => {
  const { location, navigator, innerHeight, innerWidth } = window;
  const { hash, host, hostname, href, origin, pathname, port, protocol, search } = location;
  const { language, userAgent } = navigator;
  const { title, referrer } = document;

  return {
    window: {
      location: {
        hash,
        host,
        hostname,
        href,
        origin,
        pathname,
        port,
        protocol,
        search,
      },
      navigator: { language, userAgent },
      innerHeight,
      innerWidth,
    },
    document: {
      title,
      referrer,
    },
  };
};

const useFrame = (): UseChatType => {
  const ref = useRef<HTMLIFrameElement>(null);
  const chat = useChat();
  const [style, setStyle] = useState<CSSProperties>({});

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

      const { data: message } = event;
      const context = getContext();

      switch (message.type) {
        case MESSAGE_READY: {
          const user = {
            id: chat.userID,
            attributes: {
              email: chat.userEmail,
            },
            jwt: chat.identityJWT,
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
    return { enabled: true, src: chat.chatURL, ref, style };
  }

  return { enabled: false };
};

export const Chat = () => {
  const frameProps = useFrame();

  if (!frameProps.enabled) {
    return null;
  }

  return <iframe css={iframeStyle} data-test-id="iframe-chat" title="chat" {...frameProps} />;
};
