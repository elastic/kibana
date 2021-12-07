/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./browsers/install');

import type { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/server';
import { CoreSetup, CoreStart, PluginInitializerContext } from 'kibana/server';
import { coreMock } from 'src/core/server/mocks';
import { ScreenshottingPlugin } from './plugin';
import { install } from './browsers/install';

let initContext: PluginInitializerContext;
let coreSetup: CoreSetup;
let coreStart: CoreStart;
let setupDeps: {
  screenshotMode: ScreenshotModePluginSetup;
};

beforeEach(() => {
  const configSchema = {
    browser: { chromium: { disableSandbox: false } },
  };
  initContext = coreMock.createPluginInitializerContext(configSchema);
  coreSetup = coreMock.createSetup({});
  coreStart = coreMock.createStart();
  setupDeps = {
    screenshotMode: {} as ScreenshotModePluginSetup,
  };
});

test('sets up and starts properly', async () => {
  const plugin = new ScreenshottingPlugin(initContext);
  const setupContract = plugin.setup(coreSetup, setupDeps);
  expect(setupContract).toMatchInlineSnapshot(`Object {}`);

  await coreSetup.getStartServices();

  const startContract = plugin.start(coreStart);
  expect(startContract).toMatchInlineSnapshot(`
    Object {
      "diagnose": [Function],
      "getScreenshots": [Function],
    }
  `);
});

test('handles setup issues', async () => {
  const plugin = new ScreenshottingPlugin(initContext);
  (install as jest.Mock).mockRejectedValue(`Unsupported platform!!!`);

  const setupContract = plugin.setup(coreSetup, setupDeps);
  expect(setupContract).toMatchInlineSnapshot(`Object {}`);

  await coreSetup.getStartServices();

  const startContract = plugin.start(coreStart);
  expect(startContract).toMatchInlineSnapshot(`
    Object {
      "diagnose": [Function],
      "getScreenshots": [Function],
    }
  `);
});
