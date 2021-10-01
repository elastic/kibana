/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockPluginSetup,
  createMockReportingCore,
} from '../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../types';
import { registerDiagnoseBrowser } from './browser';

jest.mock('child_process');
jest.mock('readline');

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

const devtoolMessage = 'DevTools listening on (ws://localhost:4000)';
const fontNotFoundMessage = 'Could not find the default font';

describe('POST /diagnose/browser', () => {
  jest.setTimeout(6000);
  const reportingSymbol = Symbol('reporting');
  const mockLogger = createMockLevelLogger();

  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;
  const mockedSpawn: any = spawn;
  const mockedCreateInterface: any = createInterface;

  const config = createMockConfigSchema({
    queue: { timeout: 120000 },
    capture: { browser: { chromium: { proxy: { enabled: false } } } },
  });

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => ({ usesUiCapabilities: () => false })
    );

    const mockSetupDeps = createMockPluginSetup({
      router: httpSetup.createRouter(''),
    });

    core = await createMockReportingCore(config, mockSetupDeps);

    mockedSpawn.mockImplementation(() => ({
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
      pid: 123,
      stderr: 'stderr',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    mockedCreateInterface.mockImplementation(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns a 200 when successful', async () => {
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();

    mockedCreateInterface.mockImplementation(() => ({
      addEventListener: (_e: string, cb: any) => setTimeout(() => cb(devtoolMessage), 0),
      removeEventListener: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(({ body }) => {
        expect(body.success).toEqual(true);
        expect(body.help).toEqual([]);
      });
  });

  it('returns logs when browser crashes + helpful links', async () => {
    const logs = `Could not find the default font`;
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();

    mockedCreateInterface.mockImplementation(() => ({
      addEventListener: (_e: string, cb: any) => setTimeout(() => cb(logs), 0),
      removeEventListener: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));

    mockedSpawn.mockImplementation(() => ({
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "The browser couldn't locate a default font. Please see https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies to fix this issue.",
            ],
            "logs": "Could not find the default font
          ",
            "success": false,
          }
        `);
      });
  });

  it('logs a message when the browser starts, but then has problems later', async () => {
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();

    mockedCreateInterface.mockImplementation(() => ({
      addEventListener: (_e: string, cb: any) => {
        setTimeout(() => cb(devtoolMessage), 0);
        setTimeout(() => cb(fontNotFoundMessage), 0);
      },
      removeEventListener: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));

    mockedSpawn.mockImplementation(() => ({
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "The browser couldn't locate a default font. Please see https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies to fix this issue.",
            ],
            "logs": "DevTools listening on (ws://localhost:4000)
          Could not find the default font
          ",
            "success": false,
          }
        `);
      });
  });

  it('logs a message when the browser starts, but then crashes', async () => {
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();

    mockedCreateInterface.mockImplementation(() => ({
      addEventListener: (_e: string, cb: any) => {
        setTimeout(() => cb(fontNotFoundMessage), 0);
      },
      removeEventListener: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));

    mockedSpawn.mockImplementation(() => ({
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
      addEventListener: (e: string, cb: any) => {
        if (e === 'exit') {
          setTimeout(() => cb(), 5);
        }
      },
      removeEventListener: jest.fn(),
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(({ body }) => {
        const helpArray = [...body.help];
        helpArray.sort();
        expect(helpArray).toMatchInlineSnapshot(`
          Array [
            "The browser couldn't locate a default font. Please see https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies to fix this issue.",
          ]
        `);
        expect(body.logs).toMatch(/Could not find the default font/);
        expect(body.logs).toMatch(/Browser exited abnormally during startup/);
        expect(body.success).toBe(false);
      });
  });

  it('cleans up process and subscribers', async () => {
    registerDiagnoseBrowser(core, mockLogger);

    await server.start();
    const killMock = jest.fn();
    const spawnListenersMock = jest.fn();
    const createInterfaceListenersMock = jest.fn();
    const createInterfaceCloseMock = jest.fn();

    mockedSpawn.mockImplementation(() => ({
      removeAllListeners: spawnListenersMock,
      kill: killMock,
      pid: 123,
      stderr: 'stderr',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    mockedCreateInterface.mockImplementation(() => ({
      addEventListener: (_e: string, cb: any) => setTimeout(() => cb(devtoolMessage), 0),
      removeEventListener: jest.fn(),
      removeAllListeners: createInterfaceListenersMock,
      close: createInterfaceCloseMock,
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(() => {
        expect(killMock.mock.calls.length).toBe(1);
        expect(spawnListenersMock.mock.calls.length).toBe(1);
        expect(createInterfaceListenersMock.mock.calls.length).toBe(1);
        expect(createInterfaceCloseMock.mock.calls.length).toBe(1);
      });
  });
});
