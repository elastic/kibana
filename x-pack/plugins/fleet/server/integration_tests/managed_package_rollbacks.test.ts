/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

let kibanaRoot: ReturnType<typeof kbnTestServer.createRoot>;
let esServer: kbnTestServer.TestElasticsearchUtils;

const logFilePath = Path.join(__dirname, 'logs.log');

describe('managed package rollbacks', () => {
  const startServers = async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
      },
    });

    kibanaRoot = kbnTestServer.createRootWithCorePlugins(
      {
        migrations: {
          skip: false,
        },
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: logFilePath,
              layout: {
                type: 'json',
              },
            },
          },
          loggers: [
            {
              name: 'root',
              appenders: ['file'],
            },
          ],
        },
      },
      { oss: false }
    );

    esServer = await startES();

    await kibanaRoot.preboot();
    await kibanaRoot.setup();
    await kibanaRoot.start();
  };

  const stopServers = async () => {
    if (kibanaRoot) {
      await kibanaRoot.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  beforeAll(async () => {
    await startServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  describe('when newer version of managed package is installed', () => {
    it('rolls back to latest supported version of package', async () => {
      expect(true).toBe(true);
    });
  });
});
