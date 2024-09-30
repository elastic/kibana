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
import { ElasticsearchAssetType } from '../../../../../types';

import type { EsAssetReference, Installation } from '../../../../../../common';
import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { saveArchiveEntriesFromAssetsMap, removeArchiveEntries } from '../../../archive/storage';

import { stepSaveArchiveEntries, cleanupArchiveEntriesStep } from './step_save_archive_entries';

jest.mock('../../../archive/storage', () => {
  return {
    ...jest.requireActual('../../../archive/storage'),
    saveArchiveEntriesFromAssetsMap: jest.fn(),
    removeArchiveEntries: jest.fn(),
  };
});

const mockedSaveArchiveEntriesFromAssetsMap =
  saveArchiveEntriesFromAssetsMap as jest.MockedFunction<typeof saveArchiveEntriesFromAssetsMap>;

const mockedRemoveArchiveEntries = removeArchiveEntries as jest.MockedFunction<
  typeof removeArchiveEntries
>;
let soClient: jest.Mocked<SavedObjectsClientContract>;
let esClient: jest.Mocked<ElasticsearchClient>;

const packageInstallContext = {
  packageInfo: {
    title: 'title',
    name: 'test-package',
    version: '1.0.0',
    description: 'test',
    type: 'integration',
    categories: ['cloud', 'custom'],
    format_version: 'string',
    release: 'experimental',
    conditions: { kibana: { version: 'x.y.z' } },
    owner: { github: 'elastic/fleet' },
  } as any,
  paths: ['some/path/1', 'some/path/2'],
  assetsMap: new Map([
    [
      'endpoint-0.16.0-dev.0/elasticsearch/transform/metadata_current/default.json',
      Buffer.from('{"content": "data"}'),
    ],
  ]),
};
const getMockInstalledPackageSo = (
  installedEs: EsAssetReference[] = []
): SavedObject<Installation> => {
  return {
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
      installed_es: installedEs,
      es_index_patterns: {},
      package_assets: [],
    },
    type: PACKAGES_SAVED_OBJECT_TYPE,
    references: [],
  };
};

describe('stepSaveArchiveEntries', () => {
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    jest.mocked(mockedSaveArchiveEntriesFromAssetsMap).mockReset();
  });

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
  const mockInstalledPackageSo = getMockInstalledPackageSo();
  const installedPkg = {
    ...mockInstalledPackageSo,
    attributes: {
      ...mockInstalledPackageSo.attributes,
      install_started_at: new Date(Date.now() - 1000).toISOString(),
    },
  };

  it('Should return empty packageAssetRefs if saved_objects were not found', async () => {
    jest.mocked(mockedSaveArchiveEntriesFromAssetsMap).mockResolvedValue({
      saved_objects: [],
    });
    const res = await stepSaveArchiveEntries({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'update',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });

    expect(res).toEqual({
      packageAssetRefs: [],
    });
  });

  it('Should return packageAssetRefs', async () => {
    jest.mocked(mockedSaveArchiveEntriesFromAssetsMap).mockResolvedValue({
      saved_objects: [
        {
          id: 'test',
          attributes: {
            package_name: 'test-package',
            package_version: '1.0.0',
            install_source: 'registry',
            asset_path: 'some/path',
            media_type: '',
            data_utf8: '',
            data_base64: '',
          },
          type: '',
          references: [],
        },
      ],
    });
    const res = await stepSaveArchiveEntries({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'update',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });

    expect(res).toEqual({
      packageAssetRefs: [
        {
          id: 'test',
          type: 'epm-packages-assets',
        },
      ],
    });
  });
});

describe('cleanupArchiveEntriesStep', () => {
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
      installed_es: [] as any,
      es_index_patterns: {},
    },
    type: PACKAGES_SAVED_OBJECT_TYPE,
    references: [],
  };

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    mockedRemoveArchiveEntries.mockReset();
  });
  const packageAssets = [
    {
      id: 'asset1',
      type: 'epm-packages-assets',
    },
  ];
  it('should clean up archive entries', async () => {
    await cleanupArchiveEntriesStep({
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
          package_assets: packageAssets as any,
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'save_archive_entries_from_assets_map' as any,
    });

    expect(mockedRemoveArchiveEntries).toBeCalledWith({
      savedObjectsClient: expect.anything(),
      refs: packageAssets,
    });
  });

  it('should not clean up assets if force is passed', async () => {
    await cleanupArchiveEntriesStep({
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
          package_assets: packageAssets as any,
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      force: true,
      retryFromLastState: true,
      initialState: 'save_archive_entries_from_assets_map' as any,
    });

    expect(mockedRemoveArchiveEntries).not.toBeCalled();
  });

  it('should not clean up assets if retryFromLastState is not passed', async () => {
    await cleanupArchiveEntriesStep({
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
          package_assets: packageAssets as any,
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      initialState: 'save_archive_entries_from_assets_map' as any,
    });

    expect(mockedRemoveArchiveEntries).not.toBeCalled();
  });

  it('should not clean up assets if initialState != save_archive_entries_from_assets_map', async () => {
    await cleanupArchiveEntriesStep({
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
          package_assets: packageAssets as any,
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'create_restart_install' as any,
    });

    expect(mockedRemoveArchiveEntries).not.toBeCalled();
  });

  it('should not clean up assets if attributes are not present', async () => {
    await cleanupArchiveEntriesStep({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'save_archive_entries_from_assets_map' as any,
    });

    expect(mockedRemoveArchiveEntries).not.toBeCalled();
  });
});
