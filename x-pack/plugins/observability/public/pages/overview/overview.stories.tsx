/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { OverviewPage } from './';
import { alertsFetchData } from './mock/alerts.mock';
import { emptyResponse as emptyAPMResponse, fetchApmData } from './mock/apm.mock';
import { emptyResponse as emptyLogsResponse, fetchLogsData } from './mock/logs.mock';
import { emptyResponse as emptyMetricsResponse, fetchMetricsData } from './mock/metrics.mock';
import { newsFeedFetchData } from './mock/news_feed.mock';
import { emptyResponse as emptyUptimeResponse, fetchUptimeData } from './mock/uptime.mock';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import {
  createKibanaReactContext,
  KibanaPageTemplate,
} from '../../../../../../src/plugins/kibana_react/public';
import { ApmIndicesConfig } from '../../../common/typings';

function unregisterAll() {
  unregisterDataHandler({ appName: 'apm' });
  unregisterDataHandler({ appName: 'infra_logs' });
  unregisterDataHandler({ appName: 'infra_metrics' });
  unregisterDataHandler({ appName: 'synthetics' });
}

const sampleAPMIndices = { transaction: 'apm-*' } as ApmIndicesConfig;

const withCore = makeDecorator({
  name: 'withCore',
  parameterName: 'core',
  wrapper: (storyFn, context, { options: { theme, ...options } }) => {
    unregisterAll();
    const KibanaReactContext = createKibanaReactContext({
      application: {
        getUrlForApp: () => '',
        capabilities: { navLinks: { integrations: true } },
        currentAppId$: {
          subscribe: () => {},
        },
      },
      data: {
        query: {
          timefilter: {
            timefilter: {
              setTime: () => {},
              getTime: () => ({}),
            },
          },
        },
      },
      http: {
        basePath: {
          prepend: (link: string) => `http://localhost:5601${link}`,
        },
      },
      chrome: {
        docTitle: {
          change: () => {},
        },
      },
      uiSettings: { get: () => [] },
      usageCollection: {
        reportUiCounter: () => {},
      },
    } as unknown as Partial<CoreStart>);

    return (
      <MemoryRouter>
        <KibanaReactContext.Provider>
          <PluginContext.Provider
            value={{
              appMountParameters: {
                setHeaderActionMenu: () => {},
              } as unknown as AppMountParameters,
              config: {
                unsafe: {
                  alertingExperience: { enabled: true },
                  cases: { enabled: true },
                  overviewNext: { enabled: false },
                  rules: { enabled: true },
                },
              },
              observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
              ObservabilityPageTemplate: KibanaPageTemplate,
              kibanaFeatures: [],
            }}
          >
            <HasDataContextProvider>{storyFn(context)}</HasDataContextProvider>
          </PluginContext.Provider>
        </KibanaReactContext.Provider>
      </MemoryRouter>
    );
  },
});

const core = {
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
  docLinks: {
    links: {
      observability: {
        guide: 'alink',
      },
    },
  },
} as unknown as CoreStart;

const coreWithAlerts = {
  ...core,
  http: {
    ...core.http,
    get: alertsFetchData,
  },
} as unknown as CoreStart;

const coreWithNewsFeed = {
  ...core,
  http: {
    ...core.http,
    get: newsFeedFetchData,
  },
} as unknown as CoreStart;

const coreAlertsThrowsError = {
  ...core,
  http: {
    ...core.http,
    get: async () => {
      throw new Error('Error fetching Alerts data');
    },
  },
} as unknown as CoreStart;

storiesOf('app/Overview', module)
  .addDecorator(withCore(core))
  .add('Empty State', () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: fetchApmData,
      hasData: async () => ({ hasData: false, indices: sampleAPMIndices }),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: false, indices: 'metric-*' }),
    });
    registerDataHandler({
      appName: 'synthetics',
      fetchData: fetchUptimeData,
      hasData: async () => ({ hasData: false, indices: 'heartbeat-*,synthetics-*' }),
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
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
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
        hasData: async () => ({ hasData: true, indices: 'metric-*' }),
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
        hasData: async () => ({ hasData: true, indices: 'metric-*' }),
      });
      registerDataHandler({
        appName: 'apm',
        fetchData: fetchApmData,
        hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
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
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });
    registerDataHandler({
      appName: 'synthetics',
      fetchData: fetchUptimeData,
      hasData: async () => ({ hasData: true, indices: 'heartbeat-*,synthetics-*' }),
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
        hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        hasData: async () => ({ hasData: true, indices: 'metric-*' }),
      });
      registerDataHandler({
        appName: 'synthetics',
        fetchData: fetchUptimeData,
        hasData: async () => ({ hasData: true, indices: 'heartbeat-*,synthetics-*' }),
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
        hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        hasData: async () => true,
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        hasData: async () => ({ hasData: true, indices: 'metric-*' }),
      });
      registerDataHandler({
        appName: 'synthetics',
        fetchData: fetchUptimeData,
        hasData: async () => ({ hasData: true, indices: 'heartbeat-*,synthetics-*' }),
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
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => emptyLogsResponse,
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => emptyMetricsResponse,
      hasData: async () => ({ hasData: true, indices: 'metric-*' }),
    });
    registerDataHandler({
      appName: 'synthetics',
      fetchData: async () => emptyUptimeResponse,
      hasData: async () => ({ hasData: true, indices: 'heartbeat-*,synthetics-*' }),
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
        hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
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
        hasData: async () => ({ hasData: true, indices: 'metric-*' }),
      });
      registerDataHandler({
        appName: 'synthetics',
        fetchData: async () => {
          throw new Error('Error fetching Uptime data');
        },
        hasData: async () => ({ hasData: true, indices: 'heartbeat-*,synthetics-*' }),
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
        // @ts-ignore throws an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      registerDataHandler({
        appName: 'infra_logs',
        fetchData: fetchLogsData,
        // @ts-ignore throws an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      registerDataHandler({
        appName: 'infra_metrics',
        fetchData: fetchMetricsData,
        // @ts-ignore throws an error instead
        hasData: async () => {
          throw new Error('Error has data');
        },
      });
      registerDataHandler({
        appName: 'synthetics',
        fetchData: fetchUptimeData,
        // @ts-ignore throws an error instead
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
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      // @ts-ignore throws an error instead
      hasData: async () => {
        throw new Error('Error has data');
      },
    });
    registerDataHandler({
      appName: 'synthetics',
      fetchData: fetchUptimeData,
      // @ts-ignore throws an error instead
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
