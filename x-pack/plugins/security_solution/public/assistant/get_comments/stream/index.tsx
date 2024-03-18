/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ContentMessage } from '..';
import { useStream } from './use_stream';
import { StopGeneratingButton } from './buttons/stop_generating_button';
import { RegenerateResponseButton } from './buttons/regenerate_response_button';
import { MessagePanel } from './message_panel';
import { MessageText } from './message_text';

interface Props {
  content?: string;
  isError?: boolean;
  isFetching?: boolean;
  isControlsEnabled?: boolean;
  index: number;
  connectorTypeTitle: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  refetchCurrentConversation: () => void;
  regenerateMessage: () => void;
  transformMessage: (message: string) => ContentMessage;
}

export const StreamComment = ({
  content,
  connectorTypeTitle,
  index,
  isControlsEnabled = false,
  isError = false,
  isFetching = false,
  reader,
  refetchCurrentConversation,
  regenerateMessage,
  transformMessage,
}: Props) => {
  const { error, isLoading, isStreaming, pendingMessage, setComplete } = useStream({
    refetchCurrentConversation,
    content,
    connectorTypeTitle,
    reader,
    isError,
  });

  const currentState = useRef({ isStreaming, pendingMessage, refetchCurrentConversation });

  useEffect(() => {
    currentState.current = { isStreaming, pendingMessage, refetchCurrentConversation };
  }, [refetchCurrentConversation, isStreaming, pendingMessage]);

  useEffect(
    () => () => {
      // if the component is unmounted while streaming, fetch the convo to get the completed stream
      if (currentState.current.isStreaming) {
        currentState.current.refetchCurrentConversation();
      }
    },
    // store values in currentState to detect true unmount
    []
  );

  const message = useMemo(
    // only transform streaming message, transform happens upstream for content message
    () => content ?? transformMessage(pendingMessage).content,
    [content, transformMessage, pendingMessage]
  );
  const isAnythingLoading = useMemo(
    () => isFetching || isLoading || isStreaming,
    [isFetching, isLoading, isStreaming]
  );
  const controls = useMemo(() => {
    if (!isControlsEnabled) {
      return;
    }
    if (isAnythingLoading && reader) {
      return (
        <StopGeneratingButton
          onClick={() => {
            setComplete(true);
          }}
        />
      );
    }
    return (
      <EuiFlexGroup direction="row" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <RegenerateResponseButton onClick={regenerateMessage} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [isAnythingLoading, isControlsEnabled, reader, regenerateMessage, setComplete]);

  return (
    <MessagePanel
      body={<MessageText content={message} index={index} loading={isAnythingLoading} />}
      error={error ? new Error(error) : undefined}
      controls={controls}
    />
  );
};
