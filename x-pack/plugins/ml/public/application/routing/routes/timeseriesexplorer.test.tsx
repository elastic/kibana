/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { TimeSeriesExplorerUrlStateManager } from './timeseriesexplorer';
import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { TimeSeriesExplorerPage } from '../../timeseriesexplorer/timeseriesexplorer_page';
import { TimeseriesexplorerNoJobsFound } from '../../timeseriesexplorer/components/timeseriesexplorer_no_jobs_found';

jest.mock('../../services/toast_notification_service');

jest.mock('../../timeseriesexplorer', () => ({
  TimeSeriesExplorer: jest.fn(() => {
    return null;
  }),
}));

jest.mock('../../timeseriesexplorer/timeseriesexplorer_page', () => ({
  TimeSeriesExplorerPage: jest.fn(({ children }) => {
    return <>{children}</>;
  }),
}));

jest.mock('../../timeseriesexplorer/components/timeseriesexplorer_no_jobs_found', () => ({
  TimeseriesexplorerNoJobsFound: jest.fn(() => {
    return null;
  }),
}));

const MockedTimeSeriesExplorer = TimeSeriesExplorer as jest.MockedClass<typeof TimeSeriesExplorer>;
const MockedTimeSeriesExplorerPage = TimeSeriesExplorerPage as jest.MockedFunction<
  typeof TimeSeriesExplorerPage
>;
const MockedTimeseriesexplorerNoJobsFound = TimeseriesexplorerNoJobsFound as jest.MockedFunction<
  typeof TimeseriesexplorerNoJobsFound
>;

jest.mock('../../util/url_state');

jest.mock('../../timeseriesexplorer/hooks/use_timeseriesexplorer_url_state');

jest.mock('../../components/help_menu', () => ({
  HelpMenu: () => <div id="mockHelpMenu" />,
}));

jest.mock('../../contexts/kibana/kibana_context', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { of } = require('rxjs');
  return {
    useMlKibana: () => {
      return {
        services: {
          chrome: { docTitle: { change: jest.fn() } },
          application: { getUrlForApp: jest.fn(), navigateToUrl: jest.fn() },
          share: {
            urlGenerators: { getUrlGenerator: jest.fn() },
          },
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
          docLinks: {
            links: {
              ml: { anomalyDetection: jest.fn() },
            },
          },
        },
      };
    },
  };
});

describe('TimeSeriesExplorerUrlStateManager', () => {
  test('should render TimeseriesexplorerNoJobsFound when no jobs provided', () => {
    const props = {
      config: { get: () => 'Browser' },
      jobsWithTimeRange: [],
    };

    render(
      <I18nProvider>
        <TimeSeriesExplorerUrlStateManager {...props} />
      </I18nProvider>
    );

    // assert
    expect(MockedTimeSeriesExplorer).not.toHaveBeenCalled();
    expect(MockedTimeSeriesExplorerPage).toHaveBeenCalled();
    expect(MockedTimeseriesexplorerNoJobsFound).toHaveBeenCalled();
  });
});
