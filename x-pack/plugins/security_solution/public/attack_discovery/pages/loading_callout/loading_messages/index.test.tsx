/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { LoadingMessages } from '.';
import { TestProviders } from '../../../../common/mock';
import { ATTACK_DISCOVERY_GENERATION_IN_PROGRESS } from '../translations';

describe('LoadingMessages', () => {
  it('renders the expected loading message', () => {
    render(
      <TestProviders>
        <LoadingMessages alertsCount={20} />
      </TestProviders>
    );
    const attackDiscoveryGenerationInProgress = screen.getByTestId(
      'attackDiscoveryGenerationInProgress'
    );

    expect(attackDiscoveryGenerationInProgress).toHaveTextContent(
      ATTACK_DISCOVERY_GENERATION_IN_PROGRESS
    );
  });

  it('renders the loading message with the expected alerts count', () => {
    render(
      <TestProviders>
        <LoadingMessages alertsCount={20} />
      </TestProviders>
    );
    const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aiCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 20 alerts in the last 24 hours to generate discoveries.'
    );
  });
});
