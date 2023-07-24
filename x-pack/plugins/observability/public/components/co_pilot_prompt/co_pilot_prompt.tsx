/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { TechnicalPreviewBadge } from '@kbn/observability-shared-plugin/public';
import type { ChatCompletionRequestMessage } from 'openai';
import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { catchError, Observable, of } from 'rxjs';
import { CoPilotPromptId } from '../../../common';
import type { PromptParamsOf } from '../../../common/co_pilot';
import type { CoPilotService, PromptObservableState } from '../../typings/co_pilot';
import { CoPilotPromptFeedback } from './co_pilot_prompt_feedback';

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

export interface CoPilotPromptProps<TPromptId extends CoPilotPromptId> {
  title: string;
  promptId: TPromptId;
  coPilot: CoPilotService;
  params: PromptParamsOf<TPromptId>;
  feedbackEnabled: boolean;
}

// eslint-disable-next-line import/no-default-export
export default function CoPilotPrompt<TPromptId extends CoPilotPromptId>({
  title,
  coPilot,
  promptId,
  params,
  feedbackEnabled,
}: CoPilotPromptProps<TPromptId>) {
  const [hasOpened, setHasOpened] = useState(false);

  const theme = useEuiTheme();

  const [responseTime, setResponseTime] = useState<number | undefined>(undefined);

  const conversation$ = useMemo(() => {
    if (hasOpened) {
      setResponseTime(undefined);

      const now = Date.now();

      const observable = coPilot.prompt(promptId, params).pipe(
        catchError((err) =>
          of({
            messages: [] as ChatCompletionRequestMessage[],
            loading: false,
            error: err,
            message: String(err.message),
          })
        )
      );

      observable.subscribe({
        complete: () => {
          setResponseTime(Date.now() - now);
        },
      });

      return observable;
    }

    return new Observable<PromptObservableState & { error?: any }>(() => {});
  }, [params, promptId, coPilot, hasOpened, setResponseTime]);

  const conversation = useObservable(conversation$);

  const content = conversation?.message ?? '';
  const messages = conversation?.messages;

  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  if (conversation?.loading) {
    state = content ? 'streaming' : 'loading';
  } else if (conversation && 'error' in conversation && conversation.error) {
    state = 'error';
  } else if (content) {
    state = 'complete';
  }

  let inner: React.ReactElement;

  if (state === 'complete' || state === 'streaming') {
    inner = (
      <>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {content}
          {state === 'streaming' ? <span className={cursorCss} /> : undefined}
        </p>
        {state === 'complete' ? (
          <>
            <EuiSpacer size="m" />
            {coPilot.isTrackingEnabled() && feedbackEnabled ? (
              <CoPilotPromptFeedback
                messages={messages}
                response={content}
                responseTime={responseTime!}
                promptId={promptId}
                coPilot={coPilot}
              />
            ) : undefined}
          </>
        ) : undefined}
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
    /* if (state === 'error') {*/
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
    <EuiPanel color="primary">
      <EuiAccordion
        id={title}
        css={css`
          .euiButtonIcon {
            color: ${theme.euiTheme.colors.primaryText};
          }
        `}
        buttonClassName={css`
          display: block;
          width: 100%;
        `}
        buttonContent={
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="m" color={theme.euiTheme.colors.primaryText}>
                    <strong>{title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color={theme.euiTheme.colors.primaryText}>
                    {i18n.translate('xpack.observability.coPilotChatPrompt.subtitle', {
                      defaultMessage: 'Get helpful insights from our Elastic AI Assistant',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TechnicalPreviewBadge />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen={false}
        onToggle={() => {
          setHasOpened(true);
        }}
      >
        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        {inner}
      </EuiAccordion>
    </EuiPanel>
  );
}
