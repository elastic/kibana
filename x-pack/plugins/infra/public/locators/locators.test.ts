/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { constructUrlSearchString } from './helpers';
import { LogsLocatorDefinition } from './logs_locator';
import { NodeLogsLocatorDefinition } from './node_logs_locator';
import type { LogsLocatorParams } from './logs_locator';
import type { NodeLogsLocatorParams } from './node_logs_locator';
import { LOGS_APP_TARGET } from '../../common/constants';

const APP_ID = 'logs';
const nodeType = 'host';
const LOG_VIEW_ID = 'testView';
const FILTER_QUERY = 'trace.id:1234';
const nodeId = uuidv4();
const time = 1550671089404;
const from = 1676815089000;
const to = 1682351734323;

const setupLogsLocator = async (appId: string = LOGS_APP_TARGET) => {
  const logsLocator = new LogsLocatorDefinition(appId);
  const nodeLogsLocator = new NodeLogsLocatorDefinition(appId);

  return {
    logsLocator,
    nodeLogsLocator,
  };
};

describe('Infra Locators', () => {
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
        logViewId: LOG_VIEW_ID,
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
        logViewId: LOG_VIEW_ID,
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
        logViewId: LOG_VIEW_ID,
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
        logViewId: LOG_VIEW_ID,
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
        logViewId: LOG_VIEW_ID,
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
