/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import * as Rx from 'rxjs';
import supertest from 'supertest';
import { ReportingCore } from '../../..';
import { generatePngObservable } from '../../../export_types/common';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockReportingCore,
} from '../../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../../types';
import { registerDiagnoseScreenshot } from '../screenshot';

jest.mock('../../../export_types/common/generate_png');

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('POST /diagnose/screenshot', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;

  const setScreenshotResponse = (resp: object | Error) => {
    const generateMock = {
      pipe: () =>
        Rx.defer(() => (resp instanceof Error ? Promise.reject(resp) : Promise.resolve(resp))),
    };
    (generatePngObservable as jest.Mock).mockReturnValue(generateMock);
  };

  const config = createMockConfigSchema({ queue: { timeout: 120000 } });
  const mockLogger = loggingSystemMock.createLogger();

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => ({ usesUiCapabilities: () => false })
    );

    core = await createMockReportingCore(
      config,
      createMockPluginSetup({
        router: httpSetup.createRouter(''),
        security: null,
      })
    );
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns a 200 by default', async () => {
    registerDiagnoseScreenshot(core, mockLogger);
    setScreenshotResponse({ buffer: '8fsthiy78tshiy78', warnings: [] });
    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/screenshot')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "capture": "8fsthiy78tshiy78",
            "help": Array [],
            "logs": Array [],
            "success": true,
          }
        `);
      });
  });

  it('returns a 200 when it fails and sets success to false', async () => {
    registerDiagnoseScreenshot(core, mockLogger);
    setScreenshotResponse({
      buffer: '8fsthiy78tshiy78',
      warnings: [`Timeout waiting for .dank to load`],
    });
    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/screenshot')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "capture": "8fsthiy78tshiy78",
            "help": Array [],
            "logs": Array [
              "Timeout waiting for .dank to load",
            ],
            "success": false,
          }
        `);
      });
  });

  it('logs warning if test buffer is not captured', async () => {
    registerDiagnoseScreenshot(core, mockLogger);
    setScreenshotResponse({});
    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/screenshot')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          help: ["We couldn't screenshot your Kibana install."],
          logs: ['PNG result buffer is undefined'],
          success: false,
        });
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
        expect(body).toMatchObject({
          help: ["We couldn't screenshot your Kibana install."],
          logs: ['Failure to start chromium!'],
          success: false,
        });
      });
  });
});
