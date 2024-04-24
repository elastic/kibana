/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import {
  ASSETS_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../common';
import type { RegistryPackage } from '../../../../common/types';
import type { PackagePolicySOAttributes } from '../../../types';

import { createAppContextStartContractMock } from '../../../mocks';
import { appContextService } from '../../app_context';
import { PackageNotFoundError } from '../../../errors';

import { getSettings } from '../../settings';
import { auditLoggingService } from '../../audit_logging';

import * as Registry from '../registry';

import { getInstalledPackages, getPackageInfo, getPackages, getPackageUsageStats } from './get';

jest.mock('../registry');
jest.mock('../../settings');
jest.mock('../../audit_logging');

const MockRegistry = jest.mocked(Registry);

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

const mockGetSettings = getSettings as jest.Mock;
mockGetSettings.mockResolvedValue({ prerelease_integrations_enabled: true });

describe('When using EPM `get` services', () => {
  beforeEach(() => {
    const mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  describe('and invoking getPackageUsageStats()', () => {
    let soClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      soClient = savedObjectsClientMock.create();
      const savedObjects: Array<SavedObjectsFindResult<PackagePolicySOAttributes>> = [
        {
          type: 'ingest-package-policies',
          id: 'dcf83172-c38e-4501-b236-9f479da8a7d6',
          attributes: {
            name: 'system-3',
            description: '',
            namespace: 'default',
            policy_id: '22222-22222-2222-2222',
            enabled: true,
            inputs: [],
            package: { name: 'system', title: 'System', version: '0.10.4' },
            revision: 1,
            created_at: '2020-12-22T21:28:05.380Z',
            created_by: 'elastic',
            updated_at: '2020-12-22T21:28:05.380Z',
            updated_by: 'elastic',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-22T21:28:05.383Z',
          version: 'WzE1NTAsMV0=',
          score: 0,
        },
        {
          type: 'ingest-package-policies',
          id: '5b61eb5c-d94c-48a6-a17c-b0d1f7c65336',
          attributes: {
            name: 'system-1',
            namespace: 'default',
            package: { name: 'system', title: 'System', version: '0.10.4' },
            enabled: true,
            policy_id: '11111-111111-11111-11111', // << duplicate id with plicy below
            inputs: [],
            revision: 1,
            created_at: '2020-12-21T19:22:04.902Z',
            created_by: 'system',
            updated_at: '2020-12-21T19:22:04.902Z',
            updated_by: 'system',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-21T19:22:04.905Z',
          version: 'WzIxNSwxXQ==',
          score: 0,
        },
        {
          type: 'ingest-package-policies',
          id: 'dcf83172-c38e-4501-b236-9f479da8a7d6',
          attributes: {
            name: 'system-2',
            description: '',
            namespace: 'default',
            policy_id: '11111-111111-11111-11111',
            enabled: true,
            inputs: [],
            package: { name: 'system', title: 'System', version: '0.10.4' },
            revision: 1,
            created_at: '2020-12-22T21:28:05.380Z',
            created_by: 'elastic',
            updated_at: '2020-12-22T21:28:05.380Z',
            updated_by: 'elastic',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-22T21:28:05.383Z',
          version: 'WzE1NTAsMV0=',
          score: 0,
        },
        {
          type: 'ingest-package-policies',
          id: 'dcf83172-c38e-4501-b236-9f479da8a7d6',
          attributes: {
            name: 'system-4',
            description: '',
            namespace: 'default',
            policy_id: '33333-33333-333333-333333',
            enabled: true,
            inputs: [],
            package: { name: 'system', title: 'System', version: '0.10.4' },
            revision: 1,
            created_at: '2020-12-22T21:28:05.380Z',
            created_by: 'elastic',
            updated_at: '2020-12-22T21:28:05.380Z',
            updated_by: 'elastic',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-22T21:28:05.383Z',
          version: 'WzE1NTAsMV0=',
          score: 0,
        },
      ];
      soClient.find.mockImplementation(async ({ page = 1, perPage = 20 }) => {
        let savedObjectsResponse: typeof savedObjects;

        switch (page) {
          case 1:
            savedObjectsResponse = [savedObjects[0]];
            break;
          case 2:
            savedObjectsResponse = savedObjects.slice(1);
            break;
          default:
            savedObjectsResponse = [];
        }

        return {
          page,
          per_page: perPage,
          total: 1500,
          saved_objects: savedObjectsResponse,
        };
      });
    });

    it('should query and paginate SO using package name as filter', async () => {
      await getPackageUsageStats({ savedObjectsClient: soClient, pkgName: 'system' });
      expect(soClient.find).toHaveBeenNthCalledWith(1, {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 1000,
        page: 1,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: system`,
      });
      expect(soClient.find).toHaveBeenNthCalledWith(2, {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 1000,
        page: 2,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: system`,
      });
      expect(soClient.find).toHaveBeenNthCalledWith(3, {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 1000,
        page: 3,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: system`,
      });
    });

    it('should return count of unique agent policies', async () => {
      expect(
        await getPackageUsageStats({ savedObjectsClient: soClient, pkgName: 'system' })
      ).toEqual({
        agent_policy_count: 3,
      });
    });
  });

  describe('getPackages', () => {
    beforeEach(() => {
      MockRegistry.fetchList.mockResolvedValue([
        {
          name: 'nginx',
          version: '1.0.0',
          title: 'Nginx',
        } as any,
        {
          id: 'profiler_symbolizer',
          name: 'profiler_symbolizer',
          version: '1.0.0',
          title: 'Profiler Symbolizer',
        } as any,
        {
          id: 'profiler_collector',
          name: 'profiler_collector',
          version: '1.0.0',
          title: 'Profiler Collector',
        } as any,
        {
          id: 'fleet_server',
          name: 'fleet_server',
          version: '1.0.0',
          title: 'Fleet Server',
        } as any,
      ]);
      MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue(undefined);
      MockRegistry.fetchInfo.mockResolvedValue({} as any);
      MockRegistry.pkgToPkgKey.mockImplementation(({ name, version }) => `${name}-${version}`);
    });

    it('should return installed package that is not in registry with package info', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'elasticsearch',
            attributes: {
              name: 'elasticsearch',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
            },
          },
        ],
      } as any);
      soClient.get.mockImplementation((type) => {
        if (type === 'epm-packages-assets') {
          return Promise.resolve({
            attributes: {
              data_utf8: `
name: elasticsearch
version: 0.0.1
title: Elastic
description: Elasticsearch description`,
            },
          } as any);
        } else {
          return Promise.resolve({
            id: 'elasticsearch',
            attributes: {
              name: 'elasticsearch',
              version: '0.0.1',
              install_source: 'upload',
              install_status: 'installed',
              package_assets: [],
              data_utf8: `
            name: elasticsearch
            version: 0.0.1
            title: Elastic
            description: Elasticsearch description`,
            },
          });
        }
      });
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            references: [],
            type: 'epm-package-assets',
            attributes: {
              asset_path: 'elasticsearch-0.0.1/manifest.yml',
              data_utf8: `
name: elasticsearch
version: 0.0.1
title: Elastic
description: Elasticsearch description
format_version: 0.0.1
owner: elastic`,
            },
          },
        ],
      });
      await getPackages({
        savedObjectsClient: soClient,
      });
      await expect(
        getPackages({
          savedObjectsClient: soClient,
        })
      ).resolves.toMatchObject([
        {
          id: 'elasticsearch',
          name: 'elasticsearch',
          version: '0.0.1',
          title: 'Elastic',
          description: 'Elasticsearch description',
          savedObject: {
            id: 'elasticsearch',
            attributes: {
              name: 'elasticsearch',
              version: '0.0.1',
              install_source: 'upload',
            },
          },
        },
        { id: 'fleet_server', name: 'fleet_server', title: 'Fleet Server', version: '1.0.0' },
        { id: 'nginx', name: 'nginx', title: 'Nginx', version: '1.0.0' },
      ]);
    });

    it('should filter installed package that are not in registry and not valid packages', async () => {
      const mockContract = createAppContextStartContractMock();
      appContextService.start(mockContract);

      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'invalidpackage',
            attributes: {
              name: 'invalidpackage',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
            },
          },
        ],
      } as any);
      soClient.get.mockImplementation((type) => {
        if (type === 'epm-packages-assets') {
          return Promise.resolve({
            attributes: {
              data_utf8: `
name: invalidpackage
version: 0.0.1
test: invalid manifest`,
            },
          } as any);
        } else {
          return Promise.resolve({
            id: 'invalidpackage',
            attributes: {
              name: 'invalidpackage',
              version: '0.0.1',
              install_source: 'upload',
              install_status: 'installed',
              package_assets: [],
              data_utf8: `
            name: invalidpackage
            version: 0.0.1
            title: Elastic
            test: invalid manifest`,
            },
          });
        }
      });
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            references: [],
            type: 'epm-package-assets',
            attributes: {
              asset_path: 'invalidpackage-0.0.1/manifest.yml',
              data_utf8: `
name: invalidpackage
version: 0.0.1
title: Elastic
test: invalid manifest
`,
            },
          },
        ],
      });
      const packages = await getPackages({
        savedObjectsClient: soClient,
      });
      expect(packages).toMatchObject([
        { id: 'fleet_server', name: 'fleet_server', title: 'Fleet Server', version: '1.0.0' },
        { id: 'nginx', name: 'nginx', title: 'Nginx', version: '1.0.0' },
      ]);

      expect(jest.mocked(appContextService.getLogger().warn)).toBeCalledTimes(1);
      expect(jest.mocked(appContextService.getLogger().warn)).toBeCalledWith(
        'Installed package invalidpackage 0.0.1 is not a valid package anymore'
      );
    });

    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'elasticsearch',
            attributes: {
              name: 'elasticsearch',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
              install_status: 'installed',
            },
            score: 0,
            type: PACKAGES_SAVED_OBJECT_TYPE,
            references: [],
          },
        ],
        total: 1,
        per_page: 10,
        page: 1,
      });

      soClient.get.mockImplementation((type) => {
        if (type === 'epm-packages-assets') {
          return Promise.resolve({
            attributes: {
              data_utf8: `
name: elasticsearch
version: 0.0.1
title: Elastic
description: Elasticsearch description`,
            },
          } as any);
        } else {
          return Promise.resolve({
            id: 'elasticsearch',
            attributes: {
              name: 'elasticsearch',
              version: '0.0.1',
              install_status: 'installed',
              install_source: 'upload',
              package_assets: [],
              data_utf8: `
            name: elasticsearch
            version: 0.0.1
            title: Elastic
            description: Elasticsearch description`,
            },
          });
        }
      });

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'test',
            references: [],
            type: 'epm-package-assets',
            attributes: {
              asset_path: 'elasticsearch-0.0.1/manifest.yml',
              data_utf8: `
name: elasticsearch
version: 0.0.1
title: Elastic
description: Elasticsearch description
format_version: 0.0.1
owner: elastic`,
            },
          },
        ],
      });

      await getPackages({ savedObjectsClient: soClient });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'get',
        id: 'elasticsearch',
        savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
      });
    });

    it('should hide profiling symbolizer', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'profiler_symbolizer',
            attributes: {
              name: 'profiler_symbolizer',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
            },
          },
        ],
      } as any);
      const packages = await getPackages({
        savedObjectsClient: soClient,
      });
      expect(packages.find((item) => item.id === 'profiler_symbolizer')).toBeUndefined();
    });

    it('should hide profiling collector', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'profiler_collector',
            attributes: {
              name: 'profiler_collector',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
            },
          },
        ],
      } as any);
      const packages = await getPackages({
        savedObjectsClient: soClient,
      });
      expect(packages.find((item) => item.id === 'profiler_collector')).toBeUndefined();
    });

    it('should hide fleet_server if internal.fleetServerStandalone', async () => {
      const mockContract = createAppContextStartContractMock({
        internal: {
          fleetServerStandalone: true,
        },
      } as any);
      appContextService.start(mockContract);

      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'fleet_server',
            attributes: {
              name: 'fleet_server',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
            },
          },
        ],
      } as any);
      const packages = await getPackages({
        savedObjectsClient: soClient,
      });
      expect(packages.find((item) => item.id === 'fleet_server')).toBeUndefined();
    });

    it('should filter packages configured in xpack.fleet.internal.registry.excludePackages', async () => {
      const mockContract = createAppContextStartContractMock({
        internal: {
          registry: {
            excludePackages: ['nginx'],
          },
        },
      } as any);
      appContextService.start(mockContract);

      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'nginx',
            attributes: {
              name: 'nginx',
              version: '0.0.1',
              install_source: 'upload',
              install_version: '0.0.1',
            },
          },
        ],
      } as any);
      const packages = await getPackages({
        savedObjectsClient: soClient,
      });
      expect(packages.find((item) => item.id === 'nginx')).toBeUndefined();
    });
  });

  describe('getInstalledPackages', () => {
    it('Passes the correct parameters to the SavedObjects client', async () => {
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockImplementation(async (options) => {
        if (options.type === PACKAGES_SAVED_OBJECT_TYPE) {
          return {
            total: 5,
            saved_objects: [
              {
                type: 'epm-packages',
                id: 'elastic_agent',
                attributes: {
                  data_streams: [
                    { name: 'apm_server_logs', pattern: 'logs-elastic_agent.apm_server-*' },
                    { name: 'apm_server_metrics', pattern: 'metrics-elastic_agent.apm_server-*' },
                  ],
                  name: 'elastic_agent',
                  version: '1.7.0',
                  install_status: 'installed',
                },
                references: [],
                sort: ['elastic_agent'],
              },
            ],
          } as any;
        } else if (options.type === ASSETS_SAVED_OBJECT_TYPE) {
          return {
            total: 5,
            saved_objects: [
              {
                type: 'epm-packages-assets',
                id: '338b6f9e-e126-5f1e-abb9-afe017d4788b',
                attributes: {
                  package_name: 'elastic_agent',
                  package_version: '1.8.0',
                  install_source: 'upload',
                  asset_path: 'elastic_agent-1.8.0/manifest.yml',
                  media_type: 'text/yaml; charset=utf-8',
                  data_utf8:
                    'name: elastic_agent\ntitle: Elastic Agent\nversion: 1.8.0\ndescription: Collect logs and metrics from Elastic Agents.\ntype: integration\nformat_version: 1.0.0\nlicense: basic\ncategories: ["elastic_stack"]\nconditions:\n  kibana.version: "^8.7.1"\nowner:\n  github: elastic/elastic-agent\nicons:\n  - src: /img/logo_elastic_agent.svg\n    title: logo Elastic Agent\n    size: 64x64\n    type: image/svg+xml\nscreenshots:\n  - src: /img/elastic_agent_overview.png\n    title: Elastic Agent Overview\n    size: 2560×1234\n    type: image/png\n  - src: /img/elastic_agent_metrics.png\n    title: Elastic Agent Metrics\n    size: 2560×1234\n    type: image/png\n  - src: /img/elastic_agent_info.png\n    title: Elastic Agent Information\n    size: 2560×1234\n    type: image/png\n  - src: /img/elastic_agent_integrations.png\n    title: Elastic Agent Integrations\n    size: 2560×1234\n    type: image/png\n',
                  data_base64: '',
                },
                references: [],
              },
            ],
          } as any;
        }
      });

      await getInstalledPackages({
        savedObjectsClient: soClient,
        dataStreamType: 'logs',
        nameQuery: 'nginx',
        searchAfter: ['system'],
        perPage: 10,
        sortOrder: 'asc',
      });
      expect(soClient.find).toHaveBeenCalledWith({
        filter: {
          arguments: [
            {
              arguments: [
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'epm-packages.attributes.install_status',
                },
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'installed',
                },
              ],
              function: 'is',
              type: 'function',
            },
            {
              arguments: [
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'epm-packages.attributes.installed_es',
                },
                {
                  arguments: [
                    {
                      isQuoted: false,
                      type: 'literal',
                      value: 'type',
                    },
                    {
                      isQuoted: false,
                      type: 'literal',
                      value: 'index_template',
                    },
                  ],
                  function: 'is',
                  type: 'function',
                },
              ],
              function: 'nested',
              type: 'function',
            },
            {
              arguments: [
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'epm-packages.attributes.installed_es',
                },
                {
                  arguments: [
                    {
                      isQuoted: false,
                      type: 'literal',
                      value: 'id',
                    },
                    {
                      type: 'wildcard',
                      value: 'logs-@kuery-wildcard@',
                    },
                  ],
                  function: 'is',
                  type: 'function',
                },
              ],
              function: 'nested',
              type: 'function',
            },
          ],
          function: 'and',
          type: 'function',
        },
        perPage: 10,
        search: 'nginx* | nginx',
        searchAfter: ['system'],
        searchFields: ['name'],
        sortField: 'name',
        sortOrder: 'asc',
        type: 'epm-packages',
      });
    });
    it('Formats items correctly', async () => {
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockImplementation(async (options) => {
        if (options.type === PACKAGES_SAVED_OBJECT_TYPE) {
          return {
            total: 5,
            saved_objects: [
              {
                type: 'epm-packages',
                id: 'elastic_agent',
                attributes: {
                  data_streams: [
                    { name: 'apm_server_logs', pattern: 'logs-elastic_agent.apm_server-*' },
                    { name: 'apm_server_metrics', pattern: 'metrics-elastic_agent.apm_server-*' },
                  ],
                  name: 'elastic_agent',
                  version: '1.8.0',
                  install_status: 'installed',
                },
                references: [],
                sort: ['elastic_agent'],
              },
            ],
          } as any;
        } else if (options.type === ASSETS_SAVED_OBJECT_TYPE) {
          return {
            total: 5,
            saved_objects: [
              {
                type: 'epm-packages-assets',
                id: '338b6f9e-e126-5f1e-abb9-afe017d4788b',
                attributes: {
                  package_name: 'elastic_agent',
                  package_version: '1.8.0',
                  install_source: 'upload',
                  asset_path: 'elastic_agent-1.8.0/manifest.yml',
                  media_type: 'text/yaml; charset=utf-8',
                  data_utf8:
                    'name: elastic_agent\ntitle: Elastic Agent\nversion: 1.8.0\ndescription: Collect logs and metrics from Elastic Agents.\ntype: integration\nformat_version: 1.0.0\nlicense: basic\ncategories: ["elastic_stack"]\nconditions:\n  kibana.version: "^8.7.1"\nowner:\n  github: elastic/elastic-agent\nicons:\n  - src: /img/logo_elastic_agent.svg\n    title: logo Elastic Agent\n    size: 64x64\n    type: image/svg+xml\nscreenshots:\n  - src: /img/elastic_agent_overview.png\n    title: Elastic Agent Overview\n    size: 2560×1234\n    type: image/png\n  - src: /img/elastic_agent_metrics.png\n    title: Elastic Agent Metrics\n    size: 2560×1234\n    type: image/png\n  - src: /img/elastic_agent_info.png\n    title: Elastic Agent Information\n    size: 2560×1234\n    type: image/png\n  - src: /img/elastic_agent_integrations.png\n    title: Elastic Agent Integrations\n    size: 2560×1234\n    type: image/png\n',
                  data_base64: '',
                },
                references: [],
              },
            ],
          } as any;
        }
      });

      const results = await getInstalledPackages({
        savedObjectsClient: soClient,
        dataStreamType: 'logs',
        nameQuery: 'nginx',
        searchAfter: ['system'],
        perPage: 10,
        sortOrder: 'asc',
      });

      expect(results).toEqual({
        items: [
          {
            dataStreams: [{ name: 'logs-elastic_agent.apm_server-*', title: 'apm_server_logs' }],
            name: 'elastic_agent',
            status: 'installed',
            version: '1.8.0',
            title: 'Elastic Agent',
            description: 'Collect logs and metrics from Elastic Agents.',
            icons: [
              {
                size: '64x64',
                src: '/img/logo_elastic_agent.svg',
                title: 'logo Elastic Agent',
                type: 'image/svg+xml',
              },
            ],
          },
        ],
        searchAfter: ['elastic_agent'],
        total: 5,
      });
    });
  });

  describe('getPackageInfo', () => {
    beforeEach(() => {
      const mockContract = createAppContextStartContractMock();
      appContextService.start(mockContract);
      jest.clearAllMocks();
      MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue({
        name: 'my-package',
        version: '1.0.0',
      } as RegistryPackage);
      MockRegistry.fetchInfo.mockResolvedValue({
        name: 'my-package',
        version: '1.0.0',
      } as RegistryPackage);
      MockRegistry.getPackage.mockResolvedValue({
        paths: [],
        assetsMap: new Map(),
        packageInfo: {
          name: 'my-package',
          version: '1.0.0',
        } as RegistryPackage,
      });
    });

    describe('installation status', () => {
      it('should be not_installed when no package SO exists', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'not_installed',
        });
      });

      it('should be installing when package SO install_status is installing', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'installing',
          },
        });

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'installing',
        });
      });

      it('should be installed when package SO install_status is installed', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'installed',
          },
        });

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'installed',
        });
      });

      it('should be install_failed when package SO install_status is install_failed', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'install_failed',
          },
        });

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'install_failed',
        });
      });
    });

    describe('registry fetch errors', () => {
      it('throws when a package that is not installed is not available in the registry and not bundled', async () => {
        MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue(undefined);
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).rejects.toThrowError(PackageNotFoundError);
      });

      it('sets the latestVersion to installed version when an installed package is not available in the registry', async () => {
        MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue(undefined);
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'installed',
          },
        });

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).resolves.toMatchObject({
          latestVersion: '1.0.0',
          status: 'installed',
        });
      });

      it('sets the latestVersion to installed version when an installed package is newer than package in registry', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            version: '2.0.0',
            install_status: 'installed',
          },
        });

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).resolves.toMatchObject({
          latestVersion: '1.0.0',
          status: 'installed',
        });
      });
    });

    describe('skipArchive', () => {
      it('avoids loading archive when skipArchive = true', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
        MockRegistry.fetchInfo.mockResolvedValue({
          name: 'my-package',
          version: '1.0.0',
          assets: [],
        } as unknown as RegistryPackage);

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
            skipArchive: true,
          })
        ).resolves.toMatchObject({
          latestVersion: '1.0.0',
          status: 'not_installed',
        });

        expect(MockRegistry.getPackage).not.toHaveBeenCalled();
      });

      // when calling the get package endpoint without a package version we
      // were previously incorrectly getting the info from archive
      it('avoids loading archive when skipArchive = true and no version supplied', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
        MockRegistry.fetchInfo.mockResolvedValue({
          name: 'my-package',
          version: '1.0.0',
          assets: [],
        } as unknown as RegistryPackage);

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '',
            skipArchive: true,
          })
        ).resolves.toMatchObject({
          latestVersion: '1.0.0',
          status: 'not_installed',
        });

        expect(MockRegistry.getPackage).not.toHaveBeenCalled();
      });
    });
  });
});
