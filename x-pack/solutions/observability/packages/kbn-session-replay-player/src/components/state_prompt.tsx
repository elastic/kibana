/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  CONTINUE_LABEL,
  FAILED_TITLE,
  INCOMPLETE_BODY,
  INCOMPLETE_TITLE,
  LARGE_BODY,
  LARGE_TITLE,
  LOADING_TITLE,
  PARTIAL_FAILED_TITLE,
  RETRY_LABEL,
  TRUNCATED_BODY,
  TRUNCATED_TITLE,
  UNAVAILABLE_BODIES,
  UNAVAILABLE_TITLES,
} from '../translations';
import type { ReplayUnavailableReason } from '../types';

/** Shown in place of the stage when there is nothing to play. */
export type StagePrompt =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: ReplayUnavailableReason; action?: ReactNode }
  | { kind: 'incomplete' }
  | { kind: 'failed'; error: Error; onRetry: () => void };

export const StatePrompt = ({ prompt }: { prompt: StagePrompt }) => {
  switch (prompt.kind) {
    case 'loading':
      return (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={<h2>{LOADING_TITLE}</h2>}
          data-test-subj="sessionReplayLoading"
        />
      );
    case 'unavailable':
      return (
        <EuiEmptyPrompt
          iconType="videoPlayer"
          title={<h2>{UNAVAILABLE_TITLES[prompt.reason]}</h2>}
          body={<p>{UNAVAILABLE_BODIES[prompt.reason]}</p>}
          actions={prompt.action}
          data-test-subj={`sessionReplayUnavailable-${prompt.reason}`}
        />
      );
    case 'incomplete':
      return (
        <EuiEmptyPrompt
          iconType="videoPlayer"
          title={<h2>{INCOMPLETE_TITLE}</h2>}
          body={<p>{INCOMPLETE_BODY}</p>}
          data-test-subj="sessionReplayIncomplete"
        />
      );
    case 'failed':
      return (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={<h2>{FAILED_TITLE}</h2>}
          body={<p>{prompt.error.message}</p>}
          actions={
            <EuiButton onClick={prompt.onRetry} data-test-subj="sessionReplayRetry">
              {RETRY_LABEL}
            </EuiButton>
          }
          data-test-subj="sessionReplayFailed"
        />
      );
  }
};

export type LoadingNotice =
  | { kind: 'failed'; onRetry: () => void }
  | { kind: 'truncated' }
  | { kind: 'awaitingContinue'; onContinue: () => void };

/** Shown above the controls while the recording is playable but loading did not go as planned. */
export const LoadingNoticeCallout = ({ notice }: { notice: LoadingNotice }) => {
  switch (notice.kind) {
    case 'failed':
      return (
        <KbnDangerCallout
          size="s"
          title={PARTIAL_FAILED_TITLE}
          actionProps={{
            primary: { children: RETRY_LABEL, onClick: notice.onRetry },
          }}
          data-test-subj="sessionReplayLoadFailedNotice"
        />
      );
    case 'truncated':
      return (
        <KbnWarningCallout
          size="s"
          title={TRUNCATED_TITLE}
          data-test-subj="sessionReplayTruncatedNotice"
        >
          {TRUNCATED_BODY}
        </KbnWarningCallout>
      );
    case 'awaitingContinue':
      return (
        <KbnWarningCallout
          size="s"
          title={LARGE_TITLE}
          actionProps={{
            primary: { children: CONTINUE_LABEL, onClick: notice.onContinue },
          }}
          data-test-subj="sessionReplayLargeNotice"
        >
          {LARGE_BODY}
        </KbnWarningCallout>
      );
  }
};
