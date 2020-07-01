/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { AppMountContext } from 'kibana/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';
import { PluginContext } from '../../context/plugin_context';
import { registerDataHandler, unregisterDataHandler } from '../../data_handler';
import { emptyResponse as emptyAPMResponse, fetchApmData } from '../../mock/apm.mock';
import { fetchLogsData, emptyResponse as emptyLogsResponse } from '../../mock/logs.mock';
import { fetchMetricsData, emptyResponse as emptyMetricsResponse } from '../../mock/metrics.mock';
import { fetchUptimeData, emptyResponse as emptyUptimeResponse } from '../../mock/uptime.mock';
import { EuiThemeProvider } from '../../typings';
import { OverviewPage } from './';

const core = {
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
} as AppMountContext['core'];

function unregisterAll() {
  unregisterDataHandler({ appName: 'apm' });
  unregisterDataHandler({ appName: 'infra_logs' });
  unregisterDataHandler({ appName: 'infra_metrics' });
  unregisterDataHandler({ appName: 'uptime' });
}

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('Empty state', () => {
    unregisterAll();
    return <OverviewPage routeParams={{ query: {} }} />;
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('single panel', () => {
    unregisterAll();
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('logs and metrics', () => {
    unregisterAll();
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('logs, metrics and alerts', () => {
    // TODO: add alert here
    unregisterAll();
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('logs, metrics, APM  and alerts', () => {
    // TODO: add alert here
    unregisterAll();
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('logs, metrics, APM and Uptime', () => {
    unregisterAll();
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: fetchUptimeData,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('logs, metrics, APM, Uptime and Alerts', () => {
    unregisterAll();
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: fetchUptimeData,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });

storiesOf('app/Overview', module)
  .addDecorator((storyFn) => (
    <MemoryRouter>
      <PluginContext.Provider value={{ core }}>
        <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
      </PluginContext.Provider>
    </MemoryRouter>
  ))
  .add('no data', () => {
    unregisterAll();
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => emptyAPMResponse,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => emptyLogsResponse,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => emptyMetricsResponse,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: async () => emptyUptimeResponse,
      hasData: () => Promise.resolve(true),
    });
    return (
      <OverviewPage
        routeParams={{
          query: { rangeFrom: '2020-06-27T22:00:00.000Z', rangeTo: '2020-06-30T21:59:59.999Z' },
        }}
      />
    );
  });
