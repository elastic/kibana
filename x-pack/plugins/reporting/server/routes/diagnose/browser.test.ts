/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import { createMockLevelLogger, createMockReportingCore } from '../../test_helpers';
import { registerDiagnoseBrowser } from './browser';

jest.mock('child_process');
jest.mock('readline');

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

const devtoolMessage = 'DevTools listening on (ws://localhost:4000)';
const fontNotFoundMessage = 'Could not find the default font';

describe('POST /diagnose/browser', () => {
  const reportingSymbol = Symbol('reporting');
  const mockLogger = createMockLevelLogger();

  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;
  const mockedSpawn: any = spawn;
  const mockedCreateInterface: any = createInterface;

  const config = {
    get: jest.fn().mockImplementation(() => ({})),
    kbnConfig: { get: jest.fn() },
  };

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext(reportingSymbol, 'reporting', () => ({}));

    const mockSetupDeps = ({
      elasticsearch: {
        legacy: { client: { callAsInternalUser: jest.fn() } },
      },
      router: httpSetup.createRouter(''),
    } as unknown) as any;

    core = await createMockReportingCore(config, mockSetupDeps);

    mockedSpawn.mockImplementation(() => ({
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
      pid: 123,
      stderr: 'stderr',
      once: jest.fn(),
    }));

    mockedCreateInterface.mockImplementation(() => ({
      on: jest.fn(),
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
      on: (e: string, cb: any) => cb(devtoolMessage),
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
      on: (e: string, cb: any) => cb(logs),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));

    mockedSpawn.mockImplementation(() => ({
      once: (e: string, cb: any) => cb(), // Invoke the exit event
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "Chrome couldn't find a default font, please see https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies to fix this issue.",
            ],
            "logs": "Could not find the default font
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
      on: (e: string, cb: any) => {
        cb(devtoolMessage);
        cb(fontNotFoundMessage);
      },
      removeAllListeners: jest.fn(),
      close: jest.fn(),
    }));

    mockedSpawn.mockImplementation(() => ({
      once: (e: string, cb: any) => cb(),
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
    }));

    return supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/browser')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "Chrome couldn't find a default font, please see https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies to fix this issue.",
            ],
            "logs": "DevTools listening on (ws://localhost:4000)
          Could not find the default font
          ",
            "success": false,
          }
        `);
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
      once: jest.fn(),
    }));

    mockedCreateInterface.mockImplementation(() => ({
      on: (e: string, cb: any) => cb(devtoolMessage),
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
