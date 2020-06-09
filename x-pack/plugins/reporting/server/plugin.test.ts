/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('./browsers/install', () => ({
  installBrowser: jest.fn().mockImplementation(() => ({
    binaryPath$: {
      pipe: jest.fn().mockImplementation(() => ({
        toPromise: () => Promise.resolve(),
      })),
    },
  })),
}));

import { coreMock } from 'src/core/server/mocks';
import { ReportingPlugin } from './plugin';
import { createMockConfig } from './test_helpers';

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

describe('Reporting Plugin', () => {
  let config: any;
  let initContext: any;
  let coreSetup: any;
  let coreStart: any;
  let pluginSetup: any;
  let pluginStart: any;

  beforeEach(async () => {
    config = createMockConfig();
    initContext = coreMock.createPluginInitializerContext(config);
    coreSetup = await coreMock.createSetup(config);
    coreStart = await coreMock.createStart();
    pluginSetup = ({
      licensing: {},
      usageCollection: {
        makeUsageCollector: jest.fn(),
        registerCollector: jest.fn(),
      },
      security: {
        authc: {
          getCurrentUser: () => ({
            id: '123',
            roles: ['superuser'],
            username: 'Tom Riddle',
          }),
        },
      },
    } as unknown) as any;
    pluginStart = ({
      data: {
        fieldFormats: {},
      },
    } as unknown) as any;
  });

  it('has a sync setup process', () => {
    const plugin = new ReportingPlugin(initContext);

    expect(plugin.setup(coreSetup, pluginSetup)).not.toHaveProperty('then');
  });

  it('logs setup issues', async () => {
    const plugin = new ReportingPlugin(initContext);
    // @ts-ignore overloading error logger
    plugin.logger.error = jest.fn();
    coreSetup.elasticsearch = null;
    plugin.setup(coreSetup, pluginSetup);

    await sleep(5);

    // @ts-ignore overloading error logger
    expect(plugin.logger.error.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Error in Reporting setup, reporting may not function properly
      TypeError: Cannot read property 'legacy' of null
          at jobsQueryFactory (/Users/joelgriffith/Projects/kibana/x-pack/plugins/reporting/server/lib/jobs_query.ts:50:48)
          at registerJobInfoRoutes (/Users/joelgriffith/Projects/kibana/x-pack/plugins/reporting/server/routes/jobs.ts:30:21)
          at registerRoutes (/Users/joelgriffith/Projects/kibana/x-pack/plugins/reporting/server/routes/index.ts:14:3)
          at /Users/joelgriffith/Projects/kibana/x-pack/plugins/reporting/server/plugin.ts:54:7
          at process._tickCallback (internal/process/next_tick.js:68:7)",
        ],
      ]
    `);
  });

  it('has a sync startup process', async () => {
    const plugin = new ReportingPlugin(initContext);
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    expect(plugin.start(coreStart, pluginStart)).not.toHaveProperty('then');
  });

  it('logs start issues', async () => {
    const plugin = new ReportingPlugin(initContext);
    // @ts-ignore overloading error logger
    plugin.logger.error = jest.fn();
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    plugin.start(null as any, pluginStart);
    await sleep(10);
    // @ts-ignore overloading error logger
    expect(plugin.logger.error.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Error in Reporting startup, reporting may not function properly
      TypeError: Cannot read property 'savedObjects' of null
          at /Users/joelgriffith/Projects/kibana/x-pack/plugins/reporting/server/plugin.ts:86:28",
        ],
      ]
    `);
  });
});
