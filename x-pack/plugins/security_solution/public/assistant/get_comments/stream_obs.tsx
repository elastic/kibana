/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingSpinner,
  EuiIcon,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { concatMap, delay, Observable, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

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

  let inner: React.ReactNode;

  if (state === 'complete' || state === 'streaming') {
    inner = (
      <>
        <EuiText>
          <EuiMarkdownFormat className={`message-${index}`}>{content}</EuiMarkdownFormat>
        </EuiText>
        {state === 'streaming' ? <span className={cursorCss} /> : <></>}
      </>
    );
  } else if (state === 'init' || state === 'loading') {
    inner = (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.observability.coPilotPrompt.chatLoading', {
              defaultMessage: 'Waiting for a response...',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    inner = (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon color="danger" type="warning" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{content}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {inner}
      {isLastComment && <span ref={lastCommentRef} />}
    </>
  );
};
