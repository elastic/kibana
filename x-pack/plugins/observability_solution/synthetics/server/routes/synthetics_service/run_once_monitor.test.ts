/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../common/runtime_types';
import { unzipFile } from '../../common/unzip_project_code';
import * as validator from '../monitor_cruds/monitor_validation';
import { runOnceSyntheticsMonitorRoute } from './run_once_monitor';

// Mocking the necessary modules
jest.mock('../monitor_cruds/monitor_validation', () => ({
  validateMonitor: jest.fn(),
}));
jest.mock('../monitor_cruds/add_monitor/utils', () => ({
  getPrivateLocationsForMonitor: jest.fn(),
}));

describe('runOnceSyntheticsMonitorRoute', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('will ship zipped project content for inline script monitors', async () => {
    const monitorData = { type: 'browser', name: 'test monitor' };
    jest.spyOn(validator, 'validateMonitor').mockReturnValue({
      decodedMonitor: {
        // @ts-ignore just testing zip
        type: 'browser',
        [ConfigKey.SOURCE_INLINE]: 'step("goto", () => page.goto("http://example.com"))',
        urls: 'http://example.com',
        'url.port': null,
      },
      valid: true,
    });

    const testNowConfigsMock = jest.fn() as any;
    testNowConfigsMock.mockResolvedValue([null, undefined]);
    await runOnceSyntheticsMonitorRoute().handler({
      // @ts-ignore just testing zip
      request: {
        params: { monitorId: 'test-monitor-id' },
        body: monitorData,
      },
      response: {} as any,
      server: {} as any,
      syntheticsMonitorClient: {
        testNowConfigs: testNowConfigsMock,
      } as any,
      savedObjectsClient: {} as any,
    });

    expect(testNowConfigsMock).toHaveBeenCalledTimes(1);
    const monitor = testNowConfigsMock.mock.calls[0][0].monitor;
    expect(monitor).toBeDefined();
    expect(monitor[ConfigKey.SOURCE_INLINE]).toBeUndefined();
    expect(monitor[ConfigKey.SOURCE_PROJECT_CONTENT]).toBeDefined();
    expect(await unzipFile(monitor[ConfigKey.SOURCE_PROJECT_CONTENT])).toMatchInlineSnapshot(`
      "import { journey, step, expect, mfa } from '@elastic/synthetics';

      journey('inline', ({ page, context, browser, params, request }) => {
      step(\\"goto\\", () => page.goto(\\"http://example.com\\"))
      });"
    `);
  });
});
