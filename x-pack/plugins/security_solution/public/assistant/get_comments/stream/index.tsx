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
  lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}

export const StreamComment = ({
  amendMessage,
  content,
  isLastComment,
  lastCommentRef,
  reader,
}: Props) => {
  const { error, isLoading, isStreaming, pendingMessage, setComplete, subscription } = useStream({
    amendMessage,
    content,
    reader,
  });
  const message = content ?? pendingMessage;
  const controls = useMemo(
    () =>
      reader != null ? (
        isLoading || isStreaming ? (
          <StopGeneratingButton
            onClick={() => {
              subscription?.unsubscribe();
              setComplete(true);
              console.log('stop generating');
              // setLoading(false);
              // setDisplayedMessages((prevMessages) =>
              //   prevMessages.concat({
              //     '@timestamp': new Date().toISOString(),
              //     message: {
              //       ...pendingMessage!.message,
              //     },
              //   })
              // );
              // setPendingMessage((prev) => ({
              //   message: {
              //     role: MessageRole.Assistant,
              //     ...prev?.message,
              //   },
              //   aborted: true,
              //   error: new AbortError(),
              // }));
            }}
          />
        ) : isLastComment ? (
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={false}>
              <RegenerateResponseButton
                onClick={() => {
                  console.log('RegenerateResponseButton');
                  // reloadRecalledMessages();
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null
      ) : null,
    [isLastComment, isLoading, isStreaming, reader, setComplete, subscription]
  );
  return (
    <>
      <MessagePanel
        body={
          <MessageText
            content={message}
            loading={isLoading || isStreaming}
            onActionClick={async () => {}}
          />
        }
        error={error ? new Error(error) : undefined}
        controls={controls}
      />
      {isLastComment && <span ref={lastCommentRef} />}
    </>
  );
};
