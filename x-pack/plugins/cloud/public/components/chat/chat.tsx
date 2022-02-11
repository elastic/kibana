/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { useChatConfig } from './use_chat_config';

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

  const { isReady, style } = config;
  const { bottom, height, right } = style;

  const buttonCSS = css`
    bottom: calc(${bottom} + ${height});
    position: fixed;
    right: calc(${right} + ${euiThemeVars.euiSizeXS});
    visibility: hidden;
  `;

  const button = (
    <EuiButtonEmpty
      css={buttonCSS}
      data-test-subj="cloud-chat-hide"
      name="cloudChatHide"
      onClick={() => {
        setIsClosed(true);
        onHide();
      }}
      size="xs"
    >
      {i18n.translate('xpack.cloud.chat.hideChatButtonLabel', {
        defaultMessage: 'Hide chat',
      })}
    </EuiButtonEmpty>
  );

  const containerCSS = css`
    bottom: ${euiThemeVars.euiSizeXL};
    position: fixed;
    right: ${euiThemeVars.euiSizeXL};
    visibility: ${isReady ? 'visible' : 'hidden'};
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
        title={i18n.translate('xpack.cloud.chat.chatFrameTitle', {
          defaultMessage: 'Chat',
        })}
        {...config}
      />
    </div>
  );
};
