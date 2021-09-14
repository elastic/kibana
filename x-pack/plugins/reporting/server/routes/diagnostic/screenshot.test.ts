/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import {
  createMockReportingCore,
  createMockLevelLogger,
  createMockPluginSetup,
  createMockConfigSchema,
} from '../../test_helpers';
import { registerDiagnoseScreenshot } from './screenshot';
import type { ReportingRequestHandlerContext } from '../../types';

jest.mock('../../export_types/common/generate_png');

import { generatePngObservableFactory } from '../../export_types/common';

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
    (generatePngObservableFactory as jest.Mock).mockResolvedValue(generateMock);
  };

  const config = createMockConfigSchema({ queue: { timeout: 120000 } });
  const mockLogger = createMockLevelLogger();

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
