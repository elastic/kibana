/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { type MockedLogger, loggerMock } from '@kbn/logging-mocks';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createRootWithCorePlugins,
  createTestServers,
} from '@kbn/core-test-helpers-kbn-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../common/constants';

import { appContextService } from '../services/app_context';
import { enableSpaceAwarenessMigration } from '../services/spaces/enable_space_awareness';

import {
  FLEET_AGENT_POLICIES_SCHEMA_VERSION,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '../constants';

import { useDockerRegistry, waitForFleetSetup } from './helpers';

const logFilePath = Path.join(__dirname, 'logs.log');

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

describe('enableSpaceAwareness', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {},
      },
    });

    esServer = await startES();
    const startKibana = async () => {
      const root = createRootWithCorePlugins(
        {
          xpack: {
            fleet: {
              registryUrl,
              packages: [
                {
                  name: 'nginx',
                  version: 'latest',
                },
              ],
            },
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
              {
                name: 'plugins.fleet',
                level: 'all',
              },
            ],
          },
        },
        { oss: false }
      );

      await root.preboot();
      const coreSetup = await root.setup();
      const coreStart = await root.start();

      return {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      };
    };
    kbnServer = await startKibana();

    await waitForFleetSetup(kbnServer.root);
  };

  const stopServers = async () => {
    if (kbnServer) {
      await kbnServer.stop();
    }

    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  // Share the same servers for all the test to make test a lot faster (but test are not isolated anymore)
  beforeAll(async () => {
    await startServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  let soClient: SavedObjectsClientContract;

  let logger: MockedLogger;

  beforeAll(async () => {
    soClient = kbnServer.coreStart.savedObjects.getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
    logger = loggerMock.create();
    appContextService.getLogger = () => logger;

    const RANGES = Array.from({ length: 5000 }, (value, index) => index);

    await soClient.bulkCreate(
      RANGES.map((i) => ({
        id: `agent-policy-${i}`,
        type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          name: `agent-policy-${i}`,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          revision: 1,
          updated_at: new Date().toISOString(),
        },
      })),
      {
        refresh: 'wait_for',
      }
    );

    await soClient.bulkCreate(
      RANGES.map((i) => ({
        id: `package-policy-${i}`,
        type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          name: `package-policy-${i}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })),
      {
        refresh: 'wait_for',
      }
    );
  });
  it('should support concurrent calls', async () => {
    const res = await Promise.allSettled([
      enableSpaceAwarenessMigration(),
      enableSpaceAwarenessMigration(),
      enableSpaceAwarenessMigration(),
      enableSpaceAwarenessMigration(),
      enableSpaceAwarenessMigration(),
    ]);

    const logs = loggerMock.collect(logger);
    expect(res.filter((p) => p.status === 'fulfilled')).toHaveLength(1);
    // It should start and complete the migration only once
    expect(
      logs.info.filter((m) => m[0] === 'Starting Fleet space awareness migration')
    ).toHaveLength(1);
    expect(
      logs.info.filter((m) => m[0] === 'Fleet space awareness migration is complete')
    ).toHaveLength(1);
    //
    expect(
      logs.info.filter((m) => m[0] === 'Fleet space awareness migration is pending')
    ).toHaveLength(4);

    // Check saved object are migrated
    const resAgentPolicies = await soClient.find({
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      perPage: 0,
    });
    expect(resAgentPolicies.total).toBe(5000);

    const resPackagePolicies = await soClient.find({
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      perPage: 0,
    });
    expect(resPackagePolicies.total).toBe(5000);
  });
});
