/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useStream } from './use_stream';
import { StopGeneratingButton } from './buttons/stop_generating_button';
import { RegenerateResponseButton } from './buttons/regenerate_response_button';
import { MessagePanel } from './message_panel';
import { MessageText } from './message_text';

interface Props {
  amendMessage: (message: string, index: number) => void;
  index: number;
  isLastComment: boolean;
  lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

export const StreamComment = ({
  amendMessage,
  index,
  isLastComment,
  lastCommentRef,
  reader,
}: Props) => {
  const { subscription, setComplete, isLoading, isStreaming, pendingMessage, error } = useStream({
    amendMessage,
    index,
    reader,
  });
  return (
    <>
      <MessagePanel
        body={
          <MessageText
            content={pendingMessage ?? ''}
            loading={isLoading || isStreaming}
            onActionClick={async () => {}}
          />
        }
        error={error ? new Error(error) : undefined}
        controls={
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
          ) : (
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
          )
        }
      />
      {isLastComment && <span ref={lastCommentRef} />}
    </>
  );
};
