/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { ElasticsearchClient } from 'kibana/server';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import { ReportingConfigType } from '../../config';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockLevelLogger,
  createMockPluginSetup,
  createMockReportingCore,
} from '../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../types';
import { registerDiagnoseConfig } from './config';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /diagnose/config', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;
  let mockSetupDeps: any;
  let config: ReportingConfigType;
  let mockEsClient: DeeplyMockedKeys<ElasticsearchClient>;

  const mockLogger = createMockLevelLogger();

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => ({ usesUiCapabilities: () => false })
    );

    mockSetupDeps = createMockPluginSetup({
      router: httpSetup.createRouter(''),
    } as unknown) as any;

    config = createMockConfigSchema({ queue: { timeout: 120000 }, csv: { maxSizeBytes: 1024 } });
    core = await createMockReportingCore(config, mockSetupDeps);
    mockEsClient = (await core.getEsClient()).asInternalUser as typeof mockEsClient;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns a 200 by default when configured properly', async () => {
    mockEsClient.cluster.getSettings.mockResolvedValueOnce({
      body: {
        defaults: {
          http: {
            max_content_length: '100mb',
          },
        },
      },
    } as any);
    registerDiagnoseConfig(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/config')
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

  it('returns a 200 with help text when not configured properly', async () => {
    core.setConfig(
      createMockConfig(
        createMockConfigSchema({ queue: { timeout: 120000 }, csv: { maxSizeBytes: 10485760 } })
      )
    );
    mockEsClient.cluster.getSettings.mockResolvedValueOnce({
      body: {
        defaults: {
          http: {
            max_content_length: '5mb',
          },
        },
      },
    } as any);
    registerDiagnoseConfig(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/diagnose/config')
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
          Object {
            "help": Array [
              "xpack.reporting.csv.maxSizeBytes (10485760) is higher than ElasticSearch's http.max_content_length (5242880). Please set http.max_content_length in ElasticSearch to match, or lower your xpack.reporting.csv.maxSizeBytes in Kibana.",
            ],
            "logs": "xpack.reporting.csv.maxSizeBytes (10485760) is higher than ElasticSearch's http.max_content_length (5242880). Please set http.max_content_length in ElasticSearch to match, or lower your xpack.reporting.csv.maxSizeBytes in Kibana.",
            "success": false,
          }
        `);
      });
  });
});
