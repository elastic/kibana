/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoadingNoticeCallout, StatePrompt } from './state_prompt';

describe('StatePrompt', () => {
  it('shows progress while loading', () => {
    render(<StatePrompt prompt={{ kind: 'loading' }} />);

    expect(screen.getByText('Loading the recording')).toBeInTheDocument();
  });

  it.each([
    ['noRecording', 'No recording for this session'],
    ['sampledOut', 'This session was not recorded'],
    ['pastRetention', 'This recording is no longer available'],
  ] as const)('explains %s', (reason, title) => {
    render(<StatePrompt prompt={{ kind: 'unavailable', reason }} />);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByTestId(`sessionReplayUnavailable-${reason}`)).toBeInTheDocument();
  });

  it('renders the action the host supplies', () => {
    render(
      <StatePrompt
        prompt={{
          kind: 'unavailable',
          reason: 'noRecording',
          action: <a href="#session">Back to the session</a>,
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'Back to the session' })).toBeInTheDocument();
  });

  it('explains a recording that is too short', () => {
    render(<StatePrompt prompt={{ kind: 'incomplete' }} />);

    expect(screen.getByTestId('sessionReplayIncomplete')).toBeInTheDocument();
  });

  it('shows the failure and retries', () => {
    const onRetry = jest.fn();
    render(<StatePrompt prompt={{ kind: 'failed', error: new Error('boom'), onRetry }} />);

    expect(screen.getByText('boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('LoadingNoticeCallout', () => {
  it('offers a retry when loading stopped', () => {
    const onRetry = jest.fn();
    render(<LoadingNoticeCallout notice={{ kind: 'failed', onRetry }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says only part of the recording is available', () => {
    render(<LoadingNoticeCallout notice={{ kind: 'truncated' }} />);

    expect(screen.getByTestId('sessionReplayTruncatedNotice')).toBeInTheDocument();
  });

  it('asks before loading a very long recording further', () => {
    const onContinue = jest.fn();
    render(<LoadingNoticeCallout notice={{ kind: 'awaitingContinue', onContinue }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Keep loading' }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
