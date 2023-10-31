/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useStream } from './use_stream';
import { StopGeneratingButton } from './buttons/stop_generating_button';
import { RegenerateResponseButton } from './buttons/regenerate_response_button';
import { MessagePanel } from './message_panel';
import { MessageText } from './message_text';

interface Props {
  amendMessage: (message: string) => void;
  content?: string;
  isLastComment: boolean;
  isFetching?: boolean;
  regenerateMessage: () => void;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}

export const StreamComment = ({
  amendMessage,
  content,
  isLastComment,
  reader,
  regenerateMessage,
  isFetching = false,
}: Props) => {
  const { error, isLoading, isStreaming, pendingMessage, setComplete } = useStream({
    amendMessage,
    content,
    reader,
  });
  const message = useMemo(() => content ?? pendingMessage, [content, pendingMessage]);
  const isAnythingLoading = useMemo(
    () => isFetching || isLoading || isStreaming,
    [isFetching, isLoading, isStreaming]
  );
  const controls = useMemo(() => {
    if (reader == null || !isLastComment) {
      return;
    }
    if (isAnythingLoading) {
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
  }, [isAnythingLoading, isLastComment, reader, regenerateMessage, setComplete]);

  console.log('error???', error);
  return (
    <MessagePanel
      body={<MessageText content={message} loading={isAnythingLoading} />}
      error={error ? new Error(error) : undefined}
      controls={controls}
    />
  );
};
