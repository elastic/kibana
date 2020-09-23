/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import { createMockReportingCore, createMockLevelLogger } from '../../test_helpers';
import { registerDiagnoseScreenshot } from './screenshot';

jest.mock('../../export_types/png/lib/generate_png');

import { generatePngObservableFactory } from '../../export_types/png/lib/generate_png';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /diagnose/screenshot', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;

  const setScreenshotResponse = (resp: object | Error) => {
    const generateMock = Promise.resolve(() => ({
      pipe: () => ({
        toPromise: () => (resp instanceof Error ? Promise.reject(resp) : Promise.resolve(resp)),
      }),
    }));
    (generatePngObservableFactory as any).mockResolvedValue(generateMock);
  };

  const config = {
    get: jest.fn().mockImplementation((...keys) => {
      if (keys.join('.') === 'queue.timeout') {
        return 120000;
      }
    }),
    kbnConfig: { get: jest.fn() },
  };
  const mockLogger = createMockLevelLogger();

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
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns a 200 by default', async () => {
    registerDiagnoseScreenshot(core, mockLogger);
    setScreenshotResponse({ warnings: [] });
    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/screenshot')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [],
            "logs": "",
            "success": true,
          }
        `);
      });
  });

  it('returns a 200 when it fails and sets success to false', async () => {
    registerDiagnoseScreenshot(core, mockLogger);
    setScreenshotResponse({ warnings: [`Timeout waiting for .dank to load`] });
    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/screenshot')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [],
            "logs": Array [
              "Timeout waiting for .dank to load",
            ],
            "success": false,
          }
        `);
      });
  });

  it('catches errors and returns a well formed response', async () => {
    registerDiagnoseScreenshot(core, mockLogger);
    setScreenshotResponse(new Error('Failure to start chromium!'));
    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/screenshot')
      .expect(200)
      .then(({ body }) => {
        expect(body.help).toContain(`We couldn't screenshot your Kibana install.`);
        expect(body.logs).toContain(`Failure to start chromium!`);
      });
  });
});
