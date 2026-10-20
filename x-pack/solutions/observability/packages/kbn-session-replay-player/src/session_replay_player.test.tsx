/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { SessionReplayPlayer } from '..';

describe('SessionReplayPlayer', () => {
  it('renders an accessible region for the session', async () => {
    renderWithI18n(
      <Suspense fallback={null}>
        <SessionReplayPlayer sessionId="session-1" />
      </Suspense>
    );

    const region = await screen.findByRole('region', { name: 'Session replay' });

    expect(region).toHaveAttribute('data-session-id', 'session-1');
  });
});
