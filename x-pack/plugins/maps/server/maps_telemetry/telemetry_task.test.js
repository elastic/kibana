/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  getMockKbnServer,
  getMockTaskInstance,
} from '../test_utils';
import { telemetryTaskRunner } from './telemetry_task';

describe('telemetryTaskRunner', () => {
  let mockTaskInstance;
  let mockKbnServer;
  beforeEach(() => {
    mockTaskInstance = getMockTaskInstance();
    mockKbnServer = getMockKbnServer();
  });

  test('Returns empty stats on error', async () => {
    const kbnServer = { server: mockKbnServer };
    const getNextMidnight = () =>
      moment()
        .add(1, 'days')
        .startOf('day')
        .toISOString();

    const getRunner = telemetryTaskRunner();
    const runResult = await getRunner(
      { kbnServer, taskInstance: mockTaskInstance }
    ).run();

    expect(runResult).toMatchObject({
      runAt: getNextMidnight(),
      state: {
        runs: 1,
        stats: {},
      },
    });
  });
});