/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
// import { EuiButtonEmpty } from '@elastic/eui';
// import { euiThemeVars } from '@kbn/ui-theme';

import { useChatConfig, ChatApi } from './use_chat_config';
export type { ChatApi } from './use_chat_config';

export interface Props {
  /** Handler invoked when chat is hidden by someone. */
  onHide?: () => void;
  /** Handler invoked when the chat widget signals it is ready. */
  onReady?: (chatApi: ChatApi) => void;
  /** Handler invoked when the chat widget signals to be resized. */
  onResize?: () => void;

  onPlaybookFired?: () => void;
}

/**
 * A component that will display a trigger that will allow the user to chat with a human operator,
 * when the service is enabled; otherwise, it renders nothing.
 */
export const Chat = ({ onHide = () => {}, onReady, onResize, onPlaybookFired }: Props) => {
  const config = useChatConfig({ onReady, onResize, onPlaybookFired });
  // const ref = useRef<HTMLDivElement>(null);
  // const [isClosed, setIsClosed] = useState(false);

  if (!config.enabled) {
    return null;
  }

  const { isReady } = config;

  return (
    <iframe
      loading="lazy"
      data-test-subj="cloud-chat-frame"
      title={i18n.translate('xpack.cloudChat.chatFrameTitle', {
        defaultMessage: 'Chat',
      })}
      src={config.src}
      ref={config.ref}
      style={
        isReady
          ? {
              ...config.style,
              // reset
              bottom: 'auto',
              inset: 'initial',
              // position
              top: 32,
              right: 0,
            }
          : { position: 'absolute' }
      }
    />
  );

  // const buttonCSS = css`
  //   bottom: ${euiThemeVars.euiSizeXS};
  //   position: fixed;
  //   right: calc(${right} + ${euiThemeVars.euiSizeXS});
  //   visibility: ${isReady && isResized ? 'visible' : 'hidden'};
  // `;

  // const button = (
  //   <EuiButtonEmpty
  //     css={buttonCSS}
  //     data-test-subj="cloud-chat-hide"
  //     name="cloudChatHide"
  //     onClick={() => {
  //       onHide();
  //       setIsClosed(true);
  //     }}
  //     size="xs"
  //   >
  //     {i18n.translate('xpack.cloudChat.hideChatButtonLabel', {
  //       defaultMessage: 'Hide chat',
  //     })}
  //   </EuiButtonEmpty>
  // );

  // const containerCSS = css`
  //   top: ${euiThemeVars.euiSizeXL};
  //   position: fixed;
  //   right: ${euiThemeVars.euiSizeXL};
  //   z-index: ${euiThemeVars.euiZLevel9 + 1};
  //
  //   &:focus [name='cloudChatHide'],
  //   &:hover [name='cloudChatHide'] {
  //     visibility: visible;
  //   }
  // `;

  // return (
  //   // <div css={containerCSS} ref={ref} data-test-subj="cloud-chat">
  //   //   {/*{button}*/}
  //   //
  //   // </div>
  // );
};
