/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { WhenIdle } from './when_idle';
import { useChatConfig, ChatApi } from './use_chat_config';
export type { ChatApi } from './use_chat_config';

export interface Props {
  /** Handler invoked when the chat widget signals it is ready. */
  onReady?: (chatApi: ChatApi) => void;
  /** Handler invoked when the chat widget signals to be resized. */
  onResize?: () => void;
  /** Handler invoked when the playbook is fired. */
  onPlaybookFired?: () => void;
  /** The offset from the top of the page to the chat widget. */
  topOffset?: number;
}

/**
 * A component that will display a trigger that will allow the user to chat with a human operator,
 * when the service is enabled; otherwise, it renders nothing.
 */
export const Chat = ({ onReady, onResize, onPlaybookFired, topOffset = 0 }: Props) => {
  const config = useChatConfig({
    onReady,
    onResize,
    onPlaybookFired,
  });

  if (!config.enabled) {
    return null;
  }

  return (
    <WhenIdle>
      <iframe
        data-test-subj="cloud-chat-frame"
        title={i18n.translate('xpack.cloudChat.chatFrameTitle', {
          defaultMessage: 'Chat',
        })}
        src={config.src}
        ref={config.ref}
        style={
          config.isReady
            ? {
                position: 'fixed',
                ...config.style,
                // reset default button positioning
                bottom: 'auto',
                inset: 'initial',
                // force position to the top and of the page
                top: topOffset,
                right: 0,
                // TODO: if the page height is smaller than widget height + topOffset,
                // the widget will be cut off from the bottom.
                // @ts-ignore - fixes white background on iframe in chrome/system dark mode
                colorScheme: 'light',
              }
            : { display: 'none' }
        }
      />
    </WhenIdle>
  );
};
