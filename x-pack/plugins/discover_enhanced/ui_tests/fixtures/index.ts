/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@playwright/test';
import * as Url from 'url';
import { EsArchiver } from '@kbn/es-archiver';
import { KbnClient, SamlSessionManager, createEsClientForTesting } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { STATEFUL_ROLES_ROOT_PATH, readRolesDescriptorsFromResource } from '@kbn/es';
import { KibanaUrl } from './kibana_url';
import { serversConfig } from './config';

interface LoginFixture {
  loginAs: (role: string) => Promise<void>;
}

// Extend the base test with custom fixtures
interface KbtFixtures {
  log: ToolingLog;
  kbnUrl: KibanaUrl;
  esClient: Client;
  kbnClient: KbnClient;
  esArchiver: EsArchiver;
  samlAuth: SamlSessionManager;
  browserAuth: LoginFixture;
}

// singleton instances
let esClientInstance: Client | null = null;
let kbnClientInstance: KbnClient | null = null;
let esArchiverInstance: EsArchiver | null = null;
let samlSessionManagerInstance: SamlSessionManager | null = null;

export const test = base.extend<KbtFixtures>({
  log: async ({}, use) => {
    const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    await use(log);
  },

  // TODO: fix or implement alternative
  // ftrConfig: async ({ log }, use) => {
  //   const ftrConfigPath = resolve(
  //     REPO_ROOT,
  //     'x-pack/test/api_integration/deployment_agnostic/configs/stateful/platform.stateful.config.ts'
  //   );
  //   const esVersion = EsVersion.getDefault();
  //   const config = await readConfigFile(log, esVersion, ftrConfigPath);
  //   await use(config);
  // },

  kbnUrl: async ({}, use) => {
    const { protocol, hostname, port } = serversConfig.servers.kibana;
    const kbnUrl = new KibanaUrl(
      new URL(
        Url.format({
          protocol,
          hostname,
          port,
        })
      )
    );

    await use(kbnUrl);
  },

  esClient: ({}, use) => {
    if (!esClientInstance) {
      const { protocol, hostname, port, username, password } = serversConfig.servers.elasticsearch;
      esClientInstance = createEsClientForTesting({
        esUrl: Url.format(
          new URL(
            Url.format({
              protocol,
              hostname,
              port,
            })
          )
        ),
        authOverride: {
          username,
          password,
        },
      });
    }

    use(esClientInstance);
  },

  kbnClient: ({ log }, use) => {
    if (!kbnClientInstance) {
      const { protocol, hostname, port, username, password } = serversConfig.servers.kibana;
      kbnClientInstance = new KbnClient({
        log,
        url: Url.format({
          protocol,
          hostname,
          port,
          auth: `${username}:${password}`,
        }),
      });
    }

    use(kbnClientInstance);
  },

  esArchiver: async ({ kbnClient, esClient, log }, use) => {
    if (!esArchiverInstance) {
      esArchiverInstance = new EsArchiver({
        log,
        client: esClient,
        kbnClient,
        baseDir: REPO_ROOT,
      });
    }

    await use(esArchiverInstance);
  },

  samlAuth: async ({ log }, use) => {
    if (!samlSessionManagerInstance) {
      const { protocol, hostname, port, username, password } = serversConfig.servers.kibana;

      const cloudUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');
      const rolesDefinitionPath = resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH, 'roles.yml');
      const supportedRoleDescriptors = readRolesDescriptorsFromResource(
        rolesDefinitionPath
      ) as Record<string, unknown>;
      const supportedRoles = Object.keys(supportedRoleDescriptors);

      log.info('Creating new SamlSessionManager instance');
      samlSessionManagerInstance = new SamlSessionManager({
        hostOptions: {
          protocol,
          hostname,
          port,
          username,
          password,
        },
        log,
        isCloud: false,
        supportedRoles: {
          roles: supportedRoles,
          sourcePath: rolesDefinitionPath,
        },
        cloudUsersFilePath,
      });
    }

    await use(samlSessionManagerInstance);
  },

  browserAuth: async ({ samlAuth, context }, use) => {
    const loginAs = async (role: string) => {
      await context.clearCookies();
      const cookie = await samlAuth.getInteractiveUserSessionCookieWithRoleScope(role);
      await context.addCookies([
        {
          name: 'sid',
          value: cookie,
          path: '/',
          domain: 'localhost',
        },
      ]);
    };

    await use({ loginAs });
  },
});
