/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@playwright/test';
import * as Url from 'url';
import Path from 'path';
import Fs from 'fs';
import { EsArchiver } from '@kbn/es-archiver';
import { KbnClient, SamlSessionManager, createEsClientForTesting } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  readRolesDescriptorsFromResource,
} from '@kbn/es';
import { Role } from '@kbn/test/src/auth/types';
import { KibanaUrl } from './kibana_url';

interface LoginFixture {
  loginAsViewer: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  loginAsPrivilegedUser: () => Promise<void>;
}

const projectDefaultRoles = new Map<string, Role>([
  ['es', 'developer'],
  ['security', 'editor'],
  ['oblt', 'editor'],
]);

export interface ServersConfig {
  serverless: boolean;
  projectType?: 'es' | 'oblt' | 'security';
  isCloud: boolean;
  cloudUsersFilePath: string;
  hosts: {
    kibana: string;
    elasticsearch: string;
  };
  auth: {
    username: string;
    password: string;
  };
}

// Extend the base test with custom fixtures
interface KbtFixtures {
  log: ToolingLog;
  serversConfig: ServersConfig;
  kbnUrl: KibanaUrl;
  esClient: Client;
  kbnClient: KbnClient;
  esArchiver: EsArchiver;
  samlAuth: SamlSessionManager;
  browserAuth: LoginFixture;
}

// singleton instances
let logInstance: ToolingLog | null = null;
let serversConfigInstance: ServersConfig | null = null;
let kbnUrlInstance: KibanaUrl | null = null;
let esClientInstance: Client | null = null;
let kbnClientInstance: KbnClient | null = null;
let esArchiverInstance: EsArchiver | null = null;
let samlSessionManagerInstance: SamlSessionManager | null = null;

export const test = base.extend<KbtFixtures>({
  log: ({}, use) => {
    if (!logInstance) {
      logInstance = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    }

    use(logInstance);
  },

  serversConfig: ({ log }, use, testInfo) => {
    if (!serversConfigInstance) {
      const serversConfigDir = testInfo.project.use.serversConfigDir as string;
      if (!serversConfigDir || !Fs.existsSync(serversConfigDir)) {
        throw new Error(`Directory with servers configuration is missing`);
      }
      const configPath = Path.join(serversConfigDir, 'local.json');
      log.info(`Reading test servers confiuration from file: ${configPath}`);

      serversConfigInstance = JSON.parse(Fs.readFileSync(configPath, 'utf-8')) as ServersConfig;
    }

    use(serversConfigInstance);
  },

  kbnUrl: ({ serversConfig, log }, use) => {
    if (!kbnUrlInstance) {
      kbnUrlInstance = new KibanaUrl(new URL(serversConfig.hosts.kibana));
      log.info('service loaded: kbnUrl');
    }

    use(kbnUrlInstance);
  },

  esClient: ({ serversConfig, log }, use) => {
    if (!esClientInstance) {
      const elasticsearchUrl = serversConfig.hosts.elasticsearch;
      const { username, password } = serversConfig.auth;
      esClientInstance = createEsClientForTesting({
        esUrl: Url.format(elasticsearchUrl),
        authOverride: {
          username,
          password,
        },
      });
      log.info('service loaded: esClient');
    }

    use(esClientInstance);
  },

  kbnClient: ({ log, serversConfig }, use) => {
    if (!kbnClientInstance) {
      const kibanaUrl = new URL(serversConfig.hosts.kibana);
      kibanaUrl.username = serversConfig.auth.username;
      kibanaUrl.password = serversConfig.auth.password;

      kbnClientInstance = new KbnClient({
        log,
        url: kibanaUrl.toString(),
      });
      log.info('service loaded: kbnClient');
    }

    use(kbnClientInstance);
  },

  esArchiver: ({ kbnClient, esClient, log }, use) => {
    if (!esArchiverInstance) {
      esArchiverInstance = new EsArchiver({
        log,
        client: esClient,
        kbnClient,
        baseDir: REPO_ROOT,
      });
      log.info('service loaded: esArchiver');
    }

    use(esArchiverInstance);
  },

  samlAuth: ({ log, serversConfig }, use) => {
    if (!samlSessionManagerInstance) {
      const kibanaUrl = new URL(serversConfig.hosts.kibana);
      kibanaUrl.username = serversConfig.auth.username;
      kibanaUrl.password = serversConfig.auth.password;

      const rolesDefinitionPath = serversConfig.serverless
        ? resolve(SERVERLESS_ROLES_ROOT_PATH, serversConfig.projectType!, 'roles.yml')
        : resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH, 'roles.yml');

      const supportedRoleDescriptors = readRolesDescriptorsFromResource(
        rolesDefinitionPath
      ) as Record<string, unknown>;
      const supportedRoles = Object.keys(supportedRoleDescriptors);

      log.info('Creating new SamlSessionManager instance');
      samlSessionManagerInstance = new SamlSessionManager({
        hostOptions: {
          protocol: kibanaUrl.protocol.replace(':', '') as 'http' | 'https',
          hostname: kibanaUrl.hostname,
          port: Number(kibanaUrl.port),
          username: kibanaUrl.username,
          password: kibanaUrl.password,
        },
        log,
        isCloud: serversConfig.isCloud,
        supportedRoles: {
          roles: supportedRoles,
          sourcePath: rolesDefinitionPath,
        },
        cloudUsersFilePath: serversConfig.cloudUsersFilePath,
      });
      log.info('service loaded: samlAuth');
    }

    use(samlSessionManagerInstance);
  },

  browserAuth: async ({ samlAuth, context, serversConfig }, use) => {
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

    const loginAsAdmin = async () => {
      return loginAs('admin');
    };

    const loginAsViewer = async () => {
      return loginAs('viewer');
    };

    const loginAsPrivilegedUser = async () => {
      const roleName = serversConfig.serverless
        ? projectDefaultRoles.get(serversConfig.projectType!)!
        : 'editor';
      return loginAs(roleName);
    };

    await use({ loginAsAdmin, loginAsViewer, loginAsPrivilegedUser });
  },
});
