/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, within } from '@testing-library/react';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CasesMetrics } from './cases_metrics';

jest.mock('../../api');

describe('Cases metrics', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  it('renders the correct stats', async () => {
    const result = appMockRenderer.render(<CasesMetrics />);

    await waitFor(() => {
      expect(result.getByTestId('cases-metrics-stats')).toBeTruthy();
      expect(within(result.getByTestId('openStatsHeader')).getByText(20)).toBeTruthy();
      expect(within(result.getByTestId('inProgressStatsHeader')).getByText(40)).toBeTruthy();
      expect(within(result.getByTestId('closedStatsHeader')).getByText(130)).toBeTruthy();
      expect(within(result.getByTestId('mttrStatsHeader')).getByText('12s')).toBeTruthy();
    });
  });
});
