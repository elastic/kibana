/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { ChatResponseObservable } from '../../../common/co_pilot/streaming_chat_response_observable';

interface Props {
  response$: ChatResponseObservable;
}

const cursorCss = css`
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

export function CoPilotChatBody({ response$ }: Props) {
  const [content, setContent] = useState('');

  const [error, setError] = useState<any>(undefined);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('init observable');

    setContent('');
    setError(undefined);
    setLoading(true);

    const subscription = response$.subscribe({
      next: (chunks) => {
        setContent(() => chunks.map((chunk) => chunk.choices?.[0].delta.content ?? '').join(''));
      },
      error: (nextError) => {
        setError(nextError);
        setLoading(() => false);
      },
      complete: () => {
        setLoading(() => false);
      },
    });

    return () => subscription.unsubscribe();
  }, [response$]);

  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  if (loading) {
    state = content ? 'streaming' : 'loading';
  } else if (error) {
    state = 'error';
  } else if (content) {
    state = 'complete';
  }

  if (state === 'complete' || state === 'streaming') {
    return (
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {content}
        {state === 'streaming' ? <span className={cursorCss} /> : <></>}
      </p>
    );
  } else if (state === 'init' || state === 'loading') {
    return (
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
  }
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon color="danger" type="warning" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{content}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return <></>;
}
