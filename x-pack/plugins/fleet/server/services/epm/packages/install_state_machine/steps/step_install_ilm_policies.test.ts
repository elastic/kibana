/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SavedObjectsClientContract,
  ElasticsearchClient,
  SavedObject,
} from '@kbn/core/server';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';

import type { Installation } from '../../../../../../common';

import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { installILMPolicy } from '../../../elasticsearch/ilm/install';
import { installIlmForDataStream } from '../../../elasticsearch/datastream_ilm/install';
import { ElasticsearchAssetType } from '../../../../../types';

jest.mock('../../../archive/storage');
jest.mock('../../../elasticsearch/ilm/install');
jest.mock('../../../elasticsearch/datastream_ilm/install');

import { stepInstallILMPolicies } from './step_install_ilm_policies';

describe('stepInstallILMPolicies', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const mockInstalledPackageSo: SavedObject<Installation> = {
    id: 'mocked-package',
    attributes: {
      name: 'test-package',
      version: '1.0.0',
      install_status: 'installing',
      install_version: '1.0.0',
      install_started_at: new Date().toISOString(),
      install_source: 'registry',
      verification_status: 'verified',
      installed_kibana: [] as any,
      installed_es: [
        {
          id: 'metrics-endpoint.policy-0.1.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.1.0',
          type: ElasticsearchAssetType.transform,
        },
      ] as any,
      data_streams: [],
    },
    type: PACKAGES_SAVED_OBJECT_TYPE,
    references: [],
  };
  const packageInstallContext = {
    packageInfo: {
      title: 'title',
      name: 'xyz',
      version: '4.5.6',
      description: 'test',
      type: 'integration',
      categories: ['cloud', 'custom'],
      format_version: 'string',
      release: 'experimental',
      conditions: { kibana: { version: 'x.y.z' } },
      owner: { github: 'elastic/fleet' },
    } as any,
    assetsMap: new Map(),
    paths: [],
  };

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    jest.mocked(installILMPolicy).mockReset();
    jest.mocked(installIlmForDataStream).mockReset();
  });

  it('Should not install ILM policies if disabled in config', async () => {
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: true,
          fleetServerStandalone: false,
          onlyAllowAgentUpgradeToKnownVersions: false,
          retrySetupOnBoot: false,
          registry: {
            kibanaVersionCheckEnabled: true,
            capabilities: [],
            excludePackages: [],
          },
        },
      })
    );
    await stepInstallILMPolicies({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(installILMPolicy).not.toBeCalled();
    expect(installIlmForDataStream).not.toBeCalled();
  });

  it('Should not install ILM policies if disabled in config and should return esReferences form installedPkg', async () => {
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: true,
          fleetServerStandalone: false,
          onlyAllowAgentUpgradeToKnownVersions: false,
          retrySetupOnBoot: false,
          registry: {
            kibanaVersionCheckEnabled: true,
            capabilities: [],
            excludePackages: [],
          },
        },
      })
    );
    const res = await stepInstallILMPolicies({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
          installed_es: [
            {
              id: 'metrics-endpoint.policy-0.1.0-dev.0',
              type: ElasticsearchAssetType.ingestPipeline,
            },
            {
              id: 'endpoint.metadata_current-default-0.1.0',
              type: ElasticsearchAssetType.transform,
            },
          ],
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(installILMPolicy).not.toBeCalled();
    expect(installIlmForDataStream).not.toBeCalled();
    expect(res?.esReferences).toEqual([
      {
        id: 'metrics-endpoint.policy-0.1.0-dev.0',
        type: ElasticsearchAssetType.ingestPipeline,
      },
      {
        id: 'endpoint.metadata_current-default-0.1.0',
        type: ElasticsearchAssetType.transform,
      },
    ]);
  });

  it('Should installs ILM policies if not disabled in config', async () => {
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: false,
          fleetServerStandalone: false,
          onlyAllowAgentUpgradeToKnownVersions: false,
          retrySetupOnBoot: false,
          registry: {
            kibanaVersionCheckEnabled: true,
            capabilities: [],
            excludePackages: [],
          },
        },
      })
    );
    jest.mocked(installILMPolicy).mockResolvedValue([]);
    jest.mocked(installIlmForDataStream).mockResolvedValue({
      esReferences: [
        {
          id: 'metrics-endpoint.policy-0.1.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.1.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
      installedIlms: [],
    });
    const res = await stepInstallILMPolicies({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext: {
        packageInfo: {
          title: 'title',
          name: 'xyz',
          version: '4.5.6',
          description: 'test',
          type: 'integration',
          categories: ['cloud', 'custom'],
          format_version: 'string',
          release: 'experimental',
          conditions: { kibana: { version: 'x.y.z' } },
          owner: { github: 'elastic/fleet' },
        } as any,
        assetsMap: new Map(),
        paths: [],
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(installILMPolicy).toHaveBeenCalled();
    expect(installIlmForDataStream).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      []
    );
    expect(res?.esReferences).toEqual([
      {
        id: 'metrics-endpoint.policy-0.1.0-dev.0',
        type: ElasticsearchAssetType.ingestPipeline,
      },
      {
        id: 'endpoint.metadata_current-default-0.1.0',
        type: ElasticsearchAssetType.transform,
      },
    ]);
  });

  it('should return updated esReferences', async () => {
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: false,
          fleetServerStandalone: false,
          onlyAllowAgentUpgradeToKnownVersions: false,
          retrySetupOnBoot: false,
          registry: {
            kibanaVersionCheckEnabled: true,
            capabilities: [],
            excludePackages: [],
          },
        },
      })
    );
    jest.mocked(installILMPolicy).mockResolvedValue([
      {
        id: 'metrics-endpoint.policy-0.1.0-dev.0',
        type: ElasticsearchAssetType.ingestPipeline,
      },
      {
        id: 'endpoint.metadata_current-default-0.1.0',
        type: ElasticsearchAssetType.transform,
      },
      {
        id: 'endpoint.metadata_current-default-0.2.0',
        type: ElasticsearchAssetType.transform,
      },
    ] as any);
    jest.mocked(installIlmForDataStream).mockResolvedValue({
      esReferences: [
        {
          id: 'metrics-endpoint.policy-0.1.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.1.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
      ],
      installedIlms: [],
    });

    const res = await stepInstallILMPolicies({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(installILMPolicy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      [
        {
          id: 'metrics-endpoint.policy-0.1.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.1.0',
          type: ElasticsearchAssetType.transform,
        },
      ]
    );
    expect(installIlmForDataStream).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      [
        {
          id: 'metrics-endpoint.policy-0.1.0-dev.0',
          type: ElasticsearchAssetType.ingestPipeline,
        },
        {
          id: 'endpoint.metadata_current-default-0.1.0',
          type: ElasticsearchAssetType.transform,
        },
        {
          id: 'endpoint.metadata_current-default-0.2.0',
          type: ElasticsearchAssetType.transform,
        },
      ]
    );
    expect(res?.esReferences).toEqual([
      {
        id: 'metrics-endpoint.policy-0.1.0-dev.0',
        type: ElasticsearchAssetType.ingestPipeline,
      },
      {
        id: 'endpoint.metadata_current-default-0.1.0',
        type: ElasticsearchAssetType.transform,
      },
      {
        id: 'endpoint.metadata_current-default-0.2.0',
        type: ElasticsearchAssetType.transform,
      },
    ]);
  });
});
