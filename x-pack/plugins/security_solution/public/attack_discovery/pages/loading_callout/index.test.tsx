/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { LoadingCallout } from '.';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import { TestProviders } from '../../../common/mock';

describe('LoadingCallout', () => {
  const connectorIntervals: GenerationInterval[] = [
    {
      date: '2024-05-16T14:13:09.838Z',
      durationMs: 173648,
    },
    {
      date: '2024-05-16T13:59:49.620Z',
      durationMs: 146605,
    },
    {
      date: '2024-05-16T13:47:00.629Z',
      durationMs: 255163,
    },
  ];

  const defaultProps = {
    alertsCount: 30,
    approximateFutureTime: new Date(),
    connectorIntervals,
  };

  it('renders the animated loading icon', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const loadingElastic = screen.getByTestId('loadingElastic');

    expect(loadingElastic).toBeInTheDocument();
  });

  it('renders loading messages with the expected count', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const aisCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aisCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 30 alerts in the last 24 hours to generate discoveries.'
    );
  });

  it('renders the countdown', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );
    const countdown = screen.getByTestId('countdown');

    expect(countdown).toBeInTheDocument();
  });
});
