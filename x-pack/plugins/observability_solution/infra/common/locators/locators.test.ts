/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import rison from '@kbn/rison';
import { InfraLogsLocatorDefinition } from './logs_locator';
import { InfraNodeLogsLocatorDefinition } from './node_logs_locator';
import { coreMock } from '@kbn/core/public/mocks';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import moment from 'moment';
import {
  DEFAULT_LOG_VIEW,
  LogViewReference,
  LogsLocatorParams,
  NodeLogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import {
  AssetDetailsFlyoutLocatorDefinition,
  AssetDetailsLocatorDefinition,
  HostsLocatorDefinition,
  InfraLocatorDependencies,
} from '.';

const setupLogsLocator = async () => {
  const deps: InfraLocatorDependencies = {
    core: coreMock.createSetup(),
  };
  const logsLocator = new InfraLogsLocatorDefinition(deps);
  const nodeLogsLocator = new InfraNodeLogsLocatorDefinition(deps);

  return {
    logsLocator,
    nodeLogsLocator,
  };
};

const setupAssetDetailsLocator = async () => {
  const deps: InfraLocatorDependencies = {
    core: coreMock.createSetup(),
  };
  const assetDetailsLocator = new AssetDetailsLocatorDefinition(deps);
  const assetDetailsFlyoutLocator = new AssetDetailsFlyoutLocatorDefinition(deps);

  return {
    assetDetailsLocator,
    assetDetailsFlyoutLocator,
  };
};

const setupHostsLocator = async () => {
  const deps: InfraLocatorDependencies = {
    core: coreMock.createSetup(),
  };
  const hostsLocator = new HostsLocatorDefinition(deps);

  return {
    hostsLocator,
  };
};

describe('Infra Locators', () => {
  describe('Asset Details Locator', () => {
    it('should create a link to Asset Details with no state', async () => {
      const params = {
        assetType: 'host',
        assetId: '1234',
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=undefined`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const params = {
        assetType: 'host',
        assetId: '1234',
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=undefined`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Asset Details Flyout Locator', () => {
    it('should create a link to Asset Details Flyout with no state', async () => {
      const params = {
        tableProperties: {
          detailsItemId: '1234',
          pagination: {
            pageIndex: 0,
            pageSize: 10,
          },
          sorting: {
            field: 'alertsCount',
          },
        },
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsFlyoutLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsFlyoutLocator.getLocation(params);
      const tableProperties = rison.encodeUnknown(params.tableProperties);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const params = {
        tableProperties: {
          detailsItemId: '1234',
          pagination: {
            pageIndex: 0,
            pageSize: 10,
          },
          sorting: {
            field: 'alertsCount',
          },
        },
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsFlyoutLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsFlyoutLocator.getLocation(params);
      const tableProperties = rison.encodeUnknown(params.tableProperties);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Hosts Locator', () => {
    it('should create a link to Hosts with no state', async () => {
      const params = {
        query: {
          language: 'kuery',
          query: 'host.name: "foo"',
        },
        dateRange: {
          from: '2021-01-01T00:00:00.000Z',
          to: '2021-01-02T00:00:00.000Z',
        },
        limit: 10,
      };
      const { hostsLocator } = await setupHostsLocator();
      const { app, path, state } = await hostsLocator.getLocation(params);
      const searchString = rison.encodeUnknown(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?_a=${searchString}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const params = {
        query: {
          language: 'kuery',
          query: 'host.name: "test"',
        },
        dateRange: {
          from: '2021-01-01T00:00:00.000Z',
          to: '2021-01-02T00:00:00.000Z',
        },
        limit: 10,
      };
      const { hostsLocator } = await setupHostsLocator();
      const { app, path, state } = await hostsLocator.getLocation(params);
      const searchString = rison.encodeUnknown(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?_a=${searchString}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Logs Locators', () => {
    const APP_ID = 'logs';
    const FILTER_QUERY = 'trace.id:1234';
    const nodeType = 'host';
    const nodeField = findInventoryFields(nodeType).id;
    const nodeId = uuidv4();
    const time = 1550671089404;
    const from = 1676815089000;
    const to = 1682351734323;

    describe('Logs Locator', () => {
      it('should create a link to Logs with no state', async () => {
        const params: LogsLocatorParams = {
          time,
        };
        const { logsLocator } = await setupLogsLocator();
        const { app, path, state } = await logsLocator.getLocation(params);

        expect(app).toBe(APP_ID);
        expect(path).toBe(constructUrlSearchString(params));
        expect(state).toBeDefined();
        expect(Object.keys(state)).toHaveLength(0);
      });

      it('should allow specifying specific logPosition', async () => {
        const params: LogsLocatorParams = {
          time,
        };
        const { logsLocator } = await setupLogsLocator();
        const { path } = await logsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should allow specifying specific filter', async () => {
        const params: LogsLocatorParams = {
          time,
          filter: FILTER_QUERY,
        };
        const { logsLocator } = await setupLogsLocator();
        const { path } = await logsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should allow specifying specific view id', async () => {
        const params: LogsLocatorParams = {
          time,
          logView: DEFAULT_LOG_VIEW,
        };
        const { logsLocator } = await setupLogsLocator();
        const { path } = await logsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should allow specifying specific time range', async () => {
        const params: LogsLocatorParams = {
          time,
          from,
          to,
        };
        const { logsLocator } = await setupLogsLocator();
        const { path } = await logsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should return correct structured url', async () => {
        const params: LogsLocatorParams = {
          logView: DEFAULT_LOG_VIEW,
          filter: FILTER_QUERY,
          time,
        };
        const { logsLocator } = await setupLogsLocator();
        const { app, path, state } = await logsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);

        expect(app).toBe(APP_ID);
        expect(path).toBe(expected);
        expect(state).toBeDefined();
        expect(Object.keys(state)).toHaveLength(0);
      });
    });

    describe('Node Logs Locator', () => {
      it('should create a link to Node Logs with no state', async () => {
        const params: NodeLogsLocatorParams = {
          nodeId,
          nodeField,
          time,
        };
        const { nodeLogsLocator } = await setupLogsLocator();
        const { app, path, state } = await nodeLogsLocator.getLocation(params);

        expect(app).toBe(APP_ID);
        expect(path).toBe(constructUrlSearchString(params));
        expect(state).toBeDefined();
        expect(Object.keys(state)).toHaveLength(0);
      });

      it('should allow specifying specific logPosition', async () => {
        const params: NodeLogsLocatorParams = {
          nodeId,
          nodeField,
          time,
        };
        const { nodeLogsLocator } = await setupLogsLocator();
        const { path } = await nodeLogsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should allow specifying specific filter', async () => {
        const params: NodeLogsLocatorParams = {
          nodeId,
          nodeField,
          time,
          filter: FILTER_QUERY,
        };
        const { nodeLogsLocator } = await setupLogsLocator();
        const { path } = await nodeLogsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should allow specifying specific view id', async () => {
        const params: NodeLogsLocatorParams = {
          nodeId,
          nodeField,
          time,
          logView: { ...DEFAULT_LOG_VIEW, logViewId: 'test' },
        };
        const { nodeLogsLocator } = await setupLogsLocator();
        const { path } = await nodeLogsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should allow specifying specific time range', async () => {
        const params: NodeLogsLocatorParams = {
          nodeId,
          nodeField,
          time,
          from,
          to,
          logView: DEFAULT_LOG_VIEW,
        };
        const { nodeLogsLocator } = await setupLogsLocator();
        const { path } = await nodeLogsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(path).toBe(expected);
      });

      it('should return correct structured url', async () => {
        const params: NodeLogsLocatorParams = {
          nodeId,
          nodeField,
          time,
          logView: DEFAULT_LOG_VIEW,
          filter: FILTER_QUERY,
        };
        const { nodeLogsLocator } = await setupLogsLocator();
        const { app, path, state } = await nodeLogsLocator.getLocation(params);

        const expected = constructUrlSearchString(params);
        expect(app).toBe(APP_ID);
        expect(path).toBe(expected);
        expect(state).toBeDefined();
        expect(Object.keys(state)).toHaveLength(0);
      });
    });
  });
});

/**
 * Helpers
 */

export const constructUrlSearchString = (params: Partial<NodeLogsLocatorParams>) => {
  const { time = 1550671089404, logView } = params;

  return `/stream?logView=${constructLogView(logView)}&logPosition=${constructLogPosition(
    time
  )}&logFilter=${constructLogFilter(params)}`;
};

const constructLogView = (logView?: LogViewReference) => {
  const logViewId =
    logView && 'logViewId' in logView ? logView.logViewId : DEFAULT_LOG_VIEW.logViewId;

  return `(logViewId:${logViewId},type:log-view-reference)`;
};

const constructLogPosition = (time: number = 1550671089404) => {
  return `(position:(tiebreaker:0,time:'${moment(time).toISOString()}'))`;
};

const constructLogFilter = ({
  nodeField,
  nodeId,
  filter,
  timeRange,
  time,
}: Partial<NodeLogsLocatorParams>) => {
  let finalFilter = filter || '';

  if (nodeId) {
    const nodeFilter = `${nodeField}: ${nodeId}`;
    finalFilter = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;
  }

  const query = encodeURI(
    `(query:(language:kuery,query:'${finalFilter}'),refreshInterval:(pause:!t,value:5000)`
  );

  if (!time) return `${query})`;

  const fromDate = timeRange?.startTime
    ? addHoursToTimestamp(timeRange.startTime, 0)
    : addHoursToTimestamp(time, -1);

  const toDate = timeRange?.endTime
    ? addHoursToTimestamp(timeRange.endTime, 0)
    : addHoursToTimestamp(time, 1);

  return `${query},timeRange:(from:'${fromDate}',to:'${toDate}'))`;
};

const addHoursToTimestamp = (timestamp: number, hours: number): string => {
  return moment(timestamp).add({ hours }).toISOString();
};
