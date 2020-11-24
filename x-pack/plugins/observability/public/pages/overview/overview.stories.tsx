/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { makeDecorator } from '@storybook/addons';
import { storiesOf } from '@storybook/react';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';
import { HasDataContextProvider } from '../../context/has_data_context';
import { PluginContext } from '../../context/plugin_context';
import { registerDataHandler, unregisterDataHandler } from '../../data_handler';
import { ObservabilityPluginSetupDeps } from '../../plugin';
import { EuiThemeProvider } from '../../typings';
import { OverviewPage } from './';
import { alertsFetchData } from './mock/alerts.mock';
import { emptyResponse as emptyAPMResponse, fetchApmData } from './mock/apm.mock';
import { emptyResponse as emptyLogsResponse, fetchLogsData } from './mock/logs.mock';
import { emptyResponse as emptyMetricsResponse, fetchMetricsData } from './mock/metrics.mock';
import { newsFeedFetchData } from './mock/news_feed.mock';
import { emptyResponse as emptyUptimeResponse, fetchUptimeData } from './mock/uptime.mock';

function unregisterAll() {
  unregisterDataHandler({ appName: 'apm' });
  unregisterDataHandler({ appName: 'infra_logs' });
  unregisterDataHandler({ appName: 'infra_metrics' });
  unregisterDataHandler({ appName: 'uptime' });
}

const withCore = makeDecorator({
  name: 'withCore',
  parameterName: 'core',
  wrapper: (storyFn, context, { options }) => {
    unregisterAll();

    return (
      <MemoryRouter>
        <PluginContext.Provider
          value={{
            appMountParameters: ({
              setHeaderActionMenu: () => {},
            } as unknown) as AppMountParameters,
            core: options as CoreStart,
            plugins: ({
              data: {
                query: {
                  timefilter: { timefilter: { setTime: () => {}, getTime: () => ({}) } },
                },
              },
            } as unknown) as ObservabilityPluginSetupDeps,
          }}
        >
          <EuiThemeProvider>
            <HasDataContextProvider>{storyFn(context)}</HasDataContextProvider>
          </EuiThemeProvider>
        </PluginContext.Provider>
      </MemoryRouter>
    );
  },
});

const core = ({
  http: {
    basePath: {
      prepend: (link: string) => `http://localhost:5601${link}`,
    },
    get: () => Promise.resolve({ data: [] }),
  },
  uiSettings: {
    get: (key: string) => {
      const euiSettings = {
        [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
          from: 'now-15m',
          to: 'now',
        },
        [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
          pause: true,
          value: 1000,
        },
        [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
          {
            from: 'now/d',
            to: 'now/d',
            display: 'Today',
          },
          {
            from: 'now/w',
            to: 'now/w',
            display: 'This week',
          },
          {
            from: 'now-15m',
            to: 'now',
            display: 'Last 15 minutes',
          },
          {
            from: 'now-30m',
            to: 'now',
            display: 'Last 30 minutes',
          },
          {
            from: 'now-1h',
            to: 'now',
            display: 'Last 1 hour',
          },
          {
            from: 'now-24h',
            to: 'now',
            display: 'Last 24 hours',
          },
          {
            from: 'now-7d',
            to: 'now',
            display: 'Last 7 days',
          },
          {
            from: 'now-30d',
            to: 'now',
            display: 'Last 30 days',
          },
          {
            from: 'now-90d',
            to: 'now',
            display: 'Last 90 days',
          },
          {
            from: 'now-1y',
            to: 'now',
            display: 'Last 1 year',
          },
        ],
      };
      // @ts-expect-error
      return euiSettings[key];
    },
  },
} as unknown) as CoreStart;

const coreWithAlerts = ({
  ...core,
  http: {
    ...core.http,
    get: alertsFetchData,
  },
} as unknown) as CoreStart;

const coreWithNewsFeed = ({
  ...core,
  http: {
    ...core.http,
    get: newsFeedFetchData,
  },
} as unknown) as CoreStart;

const coreAlertsThrowsError = ({
  ...core,
  http: {
    ...core.http,
    get: async () => {
      throw new Error('Error fetching Alerts data');
    },
  },
} as unknown) as CoreStart;

storiesOf('app/Overview', module)
  .addDecorator(withCore(core))
  .add('Empty State', () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: fetchUptimeData,
      hasData: async () => false,
    });

    return <OverviewPage routeParams={{ query: {} }} />;
  })
  .add('Single Panel', () => {
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => true,
    });

    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  })
  .add('Logs and Metrics', () => {
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => true,
    });

    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  })
  .add(
    'Logs, Metrics, and Alerts',
    () => {
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        hasData: async () => true,
      });

      return (
        <OverviewPage
          routeParams={{
            query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
          }}
        />
      );
    },
    { core: coreWithAlerts }
  )
  .add(
    'Logs, Metrics, APM, and Alerts',
    () => {
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'apm',
        fetchData: fetchApmData,
        hasData: async () => true,
      });

      return (
        <OverviewPage
          routeParams={{
            query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
          }}
        />
      );
    },
    { core: coreWithAlerts }
  )
  .add('Logs, Metrics, APM, and Uptime', () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: fetchUptimeData,
      hasData: async () => true,
    });

    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  })
  .add(
    'Logs, Metrics, APM, Uptime, and Alerts',
    () => {
      registerDataHandler({
        appName: 'apm',
        fetchData: fetchApmData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'uptime',
        fetchData: fetchUptimeData,
        hasData: async () => true,
      });

      return (
        <OverviewPage
          routeParams={{
            query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
          }}
        />
      );
    },
    { core: coreWithAlerts }
  )
  .add(
    'Logs, Metrics, APM, Uptime, and News Feed',
    () => {
      registerDataHandler({
        appName: 'apm',
        fetchData: fetchApmData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'uptime',
        fetchData: fetchUptimeData,
        hasData: async () => true,
      });
      return (
        <OverviewPage
          routeParams={{
            query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
          }}
        />
      );
    },
    { core: coreWithNewsFeed }
  )
  .add('No Data', () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => emptyAPMResponse,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => emptyLogsResponse,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => emptyMetricsResponse,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: async () => emptyUptimeResponse,
      hasData: async () => true,
    });

    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  })
  .add(
    'Fetch Data with Error',
    () => {
      registerDataHandler({
        appName: 'apm',
        fetchData: async () => {
          throw new Error('Error fetching APM data');
        },
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: async () => {
          throw new Error('Error fetching Logs data');
        },
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: async () => {
          throw new Error('Error fetching Metric data');
        },
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'uptime',
        fetchData: async () => {
          throw new Error('Error fetching Uptime data');
        },
        hasData: async () => true,
      });
      return (
        <OverviewPage
          routeParams={{
            query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
          }}
        />
      );
    },
    { core: coreAlertsThrowsError }
  )
  .add(
    'hasData with Error and Alerts',
    () => {
      registerDataHandler({
        appName: 'apm',
        fetchData: fetchApmData,
        // @ts-ignore thows an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        // @ts-ignore thows an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        // @ts-ignore thows an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      registerDataHandler({
        appName: 'uptime',
        fetchData: fetchUptimeData,
        // @ts-ignore thows an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      return (
        <OverviewPage
          routeParams={{
            query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
          }}
        />
      );
    },
    { core: coreWithAlerts }
  )
  .add('hasData with Error', () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      // @ts-ignore thows an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      // @ts-ignore thows an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      // @ts-ignore thows an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: fetchUptimeData,
      // @ts-ignore thows an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });

    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });
