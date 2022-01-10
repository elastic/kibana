/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// app.test.js
import { screen, waitFor } from '@testing-library/react';
import { render } from './lib/helper/rtl_helpers';
import { createMemoryHistory } from 'history';
import React from 'react';
import * as telemetry from './hooks/use_telemetry';
import { MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE } from '../common/constants';
import * as data from './components/overview/empty_state/use_has_data';

import '@testing-library/jest-dom';

import { PageRouter } from './routes';

describe('PageRouter', () => {
  beforeEach(() => {
    jest.spyOn(telemetry, 'useUptimeTelemetry').mockImplementation(() => {});
    jest.spyOn(data, 'useHasData').mockReturnValue({
      loading: false,
      data: { indexExists: true, docCount: 1, indices: 'synthetics-*' },
      error: null,
      settings: {
        heartbeatIndices: 'synthetics-*',
        certAgeThreshold: 3000,
        certExpirationThreshold: 30,
        defaultConnectors: [],
      },
    });
  });
  it.each([MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE])(
    'hides ui monitor management pages when feature flag is not enabled',
    async (page) => {
      const history = createMemoryHistory();
      history.push(page);
      render(<PageRouter config={{}} />, { history });

      await waitFor(() => {
        expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
      });
    }
  );

  it.each([
    [MONITOR_ADD_ROUTE, 'Add Monitor'],
    [MONITOR_EDIT_ROUTE, 'Edit Monitor'],
  ])('shows ui monitor management pages when feature flag is enabled', async (page, heading) => {
    const history = createMemoryHistory();
    history.push(page);
    render(<PageRouter config={{ ui: { unsafe: { monitorManagement: { enabled: true } } } }} />, {
      history,
    });

    await waitFor(() => {
      expect(screen.getByText(heading)).toBeInTheDocument();
    });
  });
});
