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
import { registerDiagnoseConfig } from './config';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /diagnose/config', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;
  let mockSetupDeps: any;
  let config: any;

  const mockLogger = createMockLevelLogger();

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext(reportingSymbol, 'reporting', () => ({}));

    mockSetupDeps = ({
      elasticsearch: {
        legacy: { client: { callAsInternalUser: jest.fn() } },
      },
      router: httpSetup.createRouter(''),
    } as unknown) as any;

    config = {
      get: jest.fn().mockImplementation((...keys) => {
        const key = keys.join('.');
        switch (key) {
          case 'queue.timeout':
            return 120000;
          case 'csv.maxSizeBytes':
            return 1024;
        }
      }),
      kbnConfig: { get: jest.fn() },
    };

    core = await createMockReportingCore(config, mockSetupDeps);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns a 200 by default when configured properly', async () => {
    mockSetupDeps.elasticsearch.legacy.client.callAsInternalUser.mockImplementation(() =>
      Promise.resolve({
        defaults: {
          http: {
            max_content_length: '100mb',
          },
        },
      })
    );
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
    config.get.mockImplementation(() => 10485760);
    mockSetupDeps.elasticsearch.legacy.client.callAsInternalUser.mockImplementation(() =>
      Promise.resolve({
        defaults: {
          http: {
            max_content_length: '5mb',
          },
        },
      })
    );
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
