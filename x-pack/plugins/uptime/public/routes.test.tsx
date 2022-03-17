/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// app.test.js
import { screen } from '@testing-library/react';
import { render } from './lib/helper/rtl_helpers';
import { createMemoryHistory } from 'history';
import React from 'react';
import * as telemetry from './hooks/use_telemetry';
import { MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE } from '../common/constants';

import '@testing-library/jest-dom';

import { PageRouter } from './routes';

describe('PageRouter', () => {
  beforeEach(() => {
    jest.spyOn(telemetry, 'useUptimeTelemetry').mockImplementation(() => {});
  });
  it.each([MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE])(
    'hides ui monitor management pages when feature flag is not enabled',
    (page) => {
      const history = createMemoryHistory();
      history.push(page);
      render(<PageRouter config={{}} />, { history });

      expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
    }
  );

  it.each([
    [MONITOR_ADD_ROUTE, 'Add Monitor'],
    [MONITOR_EDIT_ROUTE, 'Edit Monitor'],
  ])('hides ui monitor management pages when feature flag is not enabled', (page, heading) => {
    const history = createMemoryHistory();
    history.push(page);
    render(<PageRouter config={{ ui: { monitorManagement: { enabled: true } } }} />, {
      history,
    });

    expect(screen.getByText(heading)).toBeInTheDocument();
  });
});
