/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { concatMap, delay, Observable, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { StopGeneratingButton } from './buttons/stop_generating_button';
import { RegenerateResponseButton } from './buttons/regenerate_response_button';
import { MessagePanel } from './message_panel';
import { MessageText } from './message_text';

export interface PromptObservableState {
  chunks: Chunk[];
  message?: string;
  error?: string;
  loading: boolean;
}

interface ChunkChoice {
  index: 0;
  delta: { role: string; content: string };
  finish_reason: null | string;
}

interface Chunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChunkChoice[];
}

const cursorCss = `
  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  animation: blink 1s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

function getMessageFromChunks(chunks: Chunk[]) {
  let message = '';
  chunks.forEach((chunk) => {
    message += chunk.choices[0]?.delta.content ?? '';
  });
  return message;
}

interface Props {
  index: number;
  isLastComment: boolean;
  lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

export const StreamComment = ({ index, isLastComment, lastCommentRef, reader }: Props) => {
  const response$ = useMemo(
    () =>
      new Observable<PromptObservableState>((observer) => {
        observer.next({ chunks: [], loading: true });

        const decoder = new TextDecoder();

        const chunks: Chunk[] = [];

        let prev: string = '';

        function read() {
          reader.read().then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
            try {
              if (done) {
                observer.next({
                  chunks,
                  message: getMessageFromChunks(chunks),
                  loading: false,
                });
                observer.complete();
                return;
              }

              let lines: string[] = (prev + decoder.decode(value)).split('\n');

              const lastLine: string = lines[lines.length - 1];

              const isPartialChunk: boolean = !!lastLine && lastLine !== 'data: [DONE]';

              if (isPartialChunk) {
                prev = lastLine;
                lines.pop();
              } else {
                prev = '';
              }

              lines = lines.map((str) => str.substr(6)).filter((str) => !!str && str !== '[DONE]');

              const nextChunks: Chunk[] = lines.map((line) => JSON.parse(line));

              nextChunks.forEach((chunk) => {
                chunks.push(chunk);
                observer.next({
                  chunks,
                  message: getMessageFromChunks(chunks),
                  loading: true,
                });
              });
            } catch (err) {
              observer.error(err);
              return;
            }
            read();
          });
        }

        read();

        return () => {
          reader.cancel();
        };
      }).pipe(concatMap((value) => of(value).pipe(delay(50)))),
    [reader]
  );

  const response = useObservable(response$);

  useEffect(() => {}, [response$]);

  let content = response?.message ?? '';

  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  if (response?.loading) {
    state = content ? 'streaming' : 'loading';
  } else if (response && 'error' in response && response.error) {
    state = 'error';
    content = response.error;
  } else if (content) {
    state = 'complete';
  }

  const isLoading = state === 'init' || state === 'loading';
  const isStreaming = state === 'streaming';

  return (
    <>
      <MessagePanel
        body={
          <MessageText
            content={content}
            loading={isLoading || isStreaming}
            onActionClick={async () => {}}
          />
        }
        error={response?.error ? new Error(response?.error) : undefined}
        controls={
          isLoading || isStreaming ? (
            <StopGeneratingButton
              onClick={() => {
                console.log('stop generating');
                // subscription?.unsubscribe();
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
