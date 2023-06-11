/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useEffect, useRef, useState } from 'react';
import { CoPilotConversation, CoPilotConversationMessage } from '../../../common/co_pilot';
import { ChatResponseObservable } from '../../../common/co_pilot/streaming_chat_response_observable';
import { CoPilotChatBody } from '../co_pilot_chat_body';
import { CoPilotChatBalloon } from './co_pilot_chat_balloon';

export function CoPilotChatConversation({
  messages,
  onSubmit,
  loading,
  response$,
  inflightRequest,
}: {
  conversation: CoPilotConversation | undefined;
  messages: CoPilotConversationMessage[] | undefined;
  onSubmit: (input: string) => Promise<void>;
  loading: boolean;
  response$: ChatResponseObservable | undefined;
  inflightRequest: string | undefined;
}) {
  const theme = useEuiTheme();

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState('');

  async function handleSubmit() {
    const prev = input;
    setInput(() => '');
    onSubmit(prev).catch(() => {
      setInput(prev);
    });
  }

  function adjustTextAreaHeight() {
    if (inputRef.current) {
      inputRef.current.style.height = '';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }

  useEffect(() => {
    adjustTextAreaHeight();
  }, [input]);

  const isLoading = !!(loading || inflightRequest || response$);

  return (
    <EuiFlexGroup
      direction="column"
      css={css`
        padding: ${theme.euiTheme.size.l};
        padding-bottom: 0;
      `}
    >
      <EuiFlexItem grow>
        {messages || response$ || inflightRequest ? (
          <EuiFlexGroup direction="column">
            {messages?.map((message) => (
              <EuiFlexItem grow={false}>
                <CoPilotChatBalloon role={message.message.role}>
                  {message.message.content}
                </CoPilotChatBalloon>
              </EuiFlexItem>
            ))}
            {inflightRequest ? (
              <EuiFlexItem grow={false}>
                {/* eslint-disable-next-line jsx-a11y/aria-role*/}
                <CoPilotChatBalloon role="user">{inflightRequest}</CoPilotChatBalloon>
              </EuiFlexItem>
            ) : undefined}
            {response$ ? (
              <EuiFlexItem grow={false}>
                {/* eslint-disable-next-line jsx-a11y/aria-role*/}
                <CoPilotChatBalloon role="assistant">
                  <CoPilotChatBody response$={response$} />
                </CoPilotChatBalloon>
              </EuiFlexItem>
            ) : undefined}
          </EuiFlexGroup>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        className={css`
          position: relative;
          padding-bottom: ${theme.euiTheme.size.l};
          .euiFormControlLayout {
            max-width: none;
          }
          .euiTextArea {
            max-width: none;
            resize: none;
            height: 40px;
            max-height: 200px;
          }
        `}
      >
        <>
          <EuiTextArea
            data-test-subj="CoPilotChatConversationTextArea"
            value={input}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmit();
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            inputRef={(next) => {
              inputRef.current = next;
              adjustTextAreaHeight();
            }}
            onSubmit={() => handleSubmit()}
            disabled={isLoading}
          />
          <EuiButtonIcon
            className={css`
              position: absolute;
              top: ${theme.euiTheme.size.xs};
              right: ${theme.euiTheme.size.xs};
            `}
            color="primary"
            size="m"
            iconType="playFilled"
            disabled={isLoading}
            isLoading={isLoading}
          />
        </>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
