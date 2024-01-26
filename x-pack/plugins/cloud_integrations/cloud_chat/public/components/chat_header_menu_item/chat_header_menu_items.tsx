/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  useEuiTheme,
  useIsWithinMinBreakpoint,
  EuiTourStep,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import chatIconDark from './chat_icon_dark.svg';
import chatIconLight from './chat_icon_light.svg';
import { Chat, ChatApi } from '../chat';

export function ChatHeaderMenuItem() {
  const [showChatButton, setChatButtonShow] = React.useState(false);
  const [chatApi, setChatApi] = React.useState<ChatApi | null>(null);
  const [showTour, setShowTour] = useLocalStorage('cloudChatTour', true);
  const { euiTheme, colorMode } = useEuiTheme();
  const ref = React.useRef<HTMLButtonElement>(null);

  // chat top offset is used to properly position the chat widget
  // it can't be static because of an edge case with banners
  const [chatTopOffset, setChatTopOffset] = React.useState(0);
  React.useEffect(() => {
    const chatButton = ref.current;
    if (!chatButton) return;
    const chatButtonClientRect = chatButton.getBoundingClientRect();
    setChatTopOffset(chatButtonClientRect.top + chatButtonClientRect.height - 8);
  }, [showChatButton]);

  const isLargeScreen = useIsWithinMinBreakpoint('m');
  if (!isLargeScreen) return null;

  return (
    <>
      {showChatButton && (
        <EuiTourStep
          title={
            <>
              <EuiIcon
                type={colorMode === 'DARK' ? chatIconLight : chatIconDark}
                size={'l'}
                css={{ marginRight: euiTheme.size.s }}
              />
              {i18n.translate('xpack.cloudChat.chatTourHeaderText', {
                defaultMessage: 'Live Chat Now',
              })}
            </>
          }
          content={
            <EuiText size={'s'}>
              <p>
                {i18n.translate('xpack.cloudChat.chatTourText', {
                  defaultMessage:
                    'Open chat for assistance with topics such as ingesting data, configuring your instance, and troubleshooting.',
                })}
              </p>
            </EuiText>
          }
          isStepOpen={showTour}
          onFinish={() => setShowTour(false)}
          minWidth={300}
          maxWidth={360}
          step={1}
          stepsTotal={1}
          anchorPosition="downRight"
        >
          <EuiButtonEmpty
            buttonRef={ref}
            css={{ color: euiTheme.colors.ghost, marginRight: euiTheme.size.m }}
            size="s"
            iconType={chatIconLight}
            data-test-subj="cloud-chat"
            onClick={() => {
              if (showTour) setShowTour(false);
              chatApi?.toggle();
            }}
          >
            {i18n.translate('xpack.cloudChat.chatButtonLabel', {
              defaultMessage: 'Live Chat',
            })}
          </EuiButtonEmpty>
        </EuiTourStep>
      )}
      {ReactDOM.createPortal(
        <Chat
          onReady={(_chatApi) => {
            setChatApi(_chatApi);
          }}
          onPlaybookFired={() => {
            setChatButtonShow(true);
          }}
          topOffset={chatTopOffset}
        />,
        document.body
      )}
    </>
  );
}
