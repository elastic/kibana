/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

import { I18nProvider } from '@kbn/i18n/react';

import { TimeSeriesExplorerUrlStateManager } from './timeseriesexplorer';

jest.mock('../../contexts/kibana/kibana_context', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { of } = require('rxjs');
  return {
    useMlKibana: () => {
      return {
        services: {
          uiSettings: { get: jest.fn() },
          data: {
            query: {
              timefilter: {
                timefilter: {
                  disableTimeRangeSelector: jest.fn(),
                  disableAutoRefreshSelector: jest.fn(),
                  enableTimeRangeSelector: jest.fn(),
                  enableAutoRefreshSelector: jest.fn(),
                  getRefreshInterval: jest.fn(),
                  setRefreshInterval: jest.fn(),
                  getTime: jest.fn(),
                  isAutoRefreshSelectorEnabled: jest.fn(),
                  isTimeRangeSelectorEnabled: jest.fn(),
                  getRefreshIntervalUpdate$: jest.fn(),
                  getTimeUpdate$: jest.fn(() => {
                    return of();
                  }),
                  getEnabledUpdated$: jest.fn(),
                },
                history: { get: jest.fn() },
              },
            },
          },
          notifications: {
            toasts: {
              addDanger: () => {},
            },
          },
        },
      };
    },
  };
});

jest.mock('../../util/dependency_cache', () => ({
  getToastNotifications: () => ({ addSuccess: jest.fn(), addDanger: jest.fn() }),
}));

jest.mock('../../../../shared_imports');

describe('TimeSeriesExplorerUrlStateManager', () => {
  test('Initial render shows "No single metric jobs found"', () => {
    const props = {
      config: { get: () => 'Browser' },
      jobsWithTimeRange: [],
    };

    const { container } = render(
      <I18nProvider>
        <MemoryRouter>
          <TimeSeriesExplorerUrlStateManager {...props} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(container.textContent).toContain('No single metric jobs found');
  });
});
