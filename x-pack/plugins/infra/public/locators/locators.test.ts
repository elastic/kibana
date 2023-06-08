/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { LogsLocatorDefinition, LogsLocatorDependencies } from './logs_locator';
import { NodeLogsLocatorDefinition } from './node_logs_locator';
import type { LogsLocatorParams } from './logs_locator';
import type { NodeLogsLocatorParams } from './node_logs_locator';
import { coreMock } from '@kbn/core/public/mocks';
import { findInventoryFields } from '../../common/inventory_models';
import moment from 'moment';
import { DEFAULT_LOG_VIEW } from '../observability_logs/log_view_state';
import type { LogViewReference } from '../../common/log_views';

const setupLogsLocator = async () => {
  const deps: LogsLocatorDependencies = {
    core: coreMock.createSetup(),
  };
  const logsLocator = new LogsLocatorDefinition(deps);
  const nodeLogsLocator = new NodeLogsLocatorDefinition(deps);

  return {
    logsLocator,
    nodeLogsLocator,
  };
};

describe('Infra Locators', () => {
  const APP_ID = 'logs';
  const nodeType = 'host';
  const FILTER_QUERY = 'trace.id:1234';
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
        nodeType,
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
        nodeType,
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
        nodeType,
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
        nodeType,
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
        nodeType,
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
        nodeType,
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
  return `(position:(tiebreaker:0,time:${time}))`;
};

const constructLogFilter = ({
  nodeType,
  nodeId,
  filter,
  timeRange,
  time,
}: Partial<NodeLogsLocatorParams>) => {
  let finalFilter = filter || '';

  if (nodeId) {
    const nodeFilter = `${findInventoryFields(nodeType!).id}: ${nodeId}`;
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
