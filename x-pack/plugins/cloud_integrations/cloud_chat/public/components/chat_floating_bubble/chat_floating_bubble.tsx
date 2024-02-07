/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiButtonEmpty } from '@elastic/eui';
import { useChatConfig, ChatApi } from '../chat/use_chat_config';
export type { ChatApi } from '../chat/use_chat_config';

export interface Props {
  /** Handler invoked when chat is hidden by someone. */
  onHide?: () => void;
  /** Handler invoked when the chat widget signals it is ready. */
  onReady?: (chatApi: ChatApi) => void;
  /** Handler invoked when the chat widget signals to be resized. */
  onResize?: () => void;
  /** Handler invoked when the playbook is fired. */
  onPlaybookFired?: () => void;
}

/**
 * This Chat widget implementation uses the default floating chat bubble in the bottom right corner of the screen.
 * It automatically appears if the playbook fires and isn't controlled from the outside
 */
export const Chat = ({ onHide = () => {}, onReady, onResize, onPlaybookFired }: Props) => {
  const config = useChatConfig({
    onReady,
    onResize,
    onPlaybookFired,
    controlled: false /* makes this chat appear automatically */,
  });
  const ref = useRef<HTMLDivElement>(null);
  const [isClosed, setIsClosed] = useState(false);

  if (!config.enabled || isClosed) {
    return null;
  }

  const { isReady, isResized, style } = config;
  const { right } = style;

  const buttonCSS = css`
    bottom: ${euiThemeVars.euiSizeXS};
    position: fixed;
    right: calc(${right} + ${euiThemeVars.euiSizeXS});
    visibility: ${isReady && isResized ? 'visible' : 'hidden'};
  `;

  const button = (
    <EuiButtonEmpty
      css={buttonCSS}
      data-test-subj="cloud-chat-hide"
      name="cloudChatHide"
      onClick={() => {
        onHide();
        setIsClosed(true);
      }}
      size="xs"
    >
      {i18n.translate('xpack.cloudChat.hideChatButtonLabel', {
        defaultMessage: 'Hide chat',
      })}
    </EuiButtonEmpty>
  );

  const containerCSS = css`
    bottom: ${euiThemeVars.euiSizeXL};
    position: fixed;
    right: ${euiThemeVars.euiSizeXL};
    z-index: ${euiThemeVars.euiZMaskBelowHeader - 1};
    &:focus [name='cloudChatHide'],
    &:hover [name='cloudChatHide'] {
      visibility: visible;
    }
  `;

  return (
    <div css={containerCSS} ref={ref} data-test-subj="cloud-chat">
      {button}
      <iframe
        data-test-subj="cloud-chat-frame"
        title={i18n.translate('xpack.cloudChat.chatFrameTitle', {
          defaultMessage: 'Chat',
        })}
        src={config.src}
        ref={config.ref}
        style={{
          ...config.style,
          // @ts-ignore - fixes white background on iframe in chrome/system dark mode
          colorScheme: 'light',
        }}
      />
    </div>
  );
};
