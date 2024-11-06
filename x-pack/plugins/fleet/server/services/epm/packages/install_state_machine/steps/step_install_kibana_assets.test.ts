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

import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { installKibanaAssetsAndReferencesMultispace } from '../../../kibana/assets/install';
import { deleteKibanaAssets } from '../../remove';

import { KibanaSavedObjectType, type Installation } from '../../../../../types';

import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';

import {
  stepInstallKibanaAssets,
  cleanUpKibanaAssetsStep,
  stepInstallKibanaAssetsWithStreaming,
  cleanUpUnusedKibanaAssetsStep,
} from './step_install_kibana_assets';

jest.mock('../../../kibana/assets/saved_objects', () => {
  return {
    getSpaceAwareSaveobjectsClients: jest.fn().mockReturnValue({
      savedObjectClientWithSpace: jest.fn(),
      savedObjectsImporter: jest.fn(),
      savedObjectTagAssignmentService: jest.fn(),
      savedObjectTagClient: jest.fn(),
    }),
  };
});
jest.mock('../../../kibana/assets/install');
jest.mock('../../remove', () => {
  return {
    ...jest.requireActual('../../remove'),
    deleteKibanaAssets: jest.fn(),
  };
});

const mockedInstallKibanaAssetsAndReferencesMultispace = jest.mocked(
  installKibanaAssetsAndReferencesMultispace
);
const mockedDeleteKibanaAssets = deleteKibanaAssets as jest.MockedFunction<
  typeof deleteKibanaAssets
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
  assetsMap: new Map(),
  archiveIterator: createArchiveIteratorFromMap(new Map()),
};

describe('stepInstallKibanaAssets', () => {
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();

    soClient.update.mockImplementation(async (type, id, attributes) => {
      return { id, attributes } as any;
    });
    soClient.get.mockImplementation(async (type, id) => {
      return { id, attributes: {} } as any;
    });
  });

  esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  appContextService.start(createAppContextStartContractMock());

  it('Should call installKibanaAssetsAndReferences', async () => {
    const installationPromise = stepInstallKibanaAssets({
      savedObjectsClient: soClient,
      esClient,
      logger: loggerMock.create(),
      packageInstallContext: {
        assetsMap: new Map(),
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
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
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    await expect(installationPromise).resolves.not.toThrowError();
    expect(installKibanaAssetsAndReferencesMultispace).toBeCalledTimes(1);
  });
  esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  appContextService.start(createAppContextStartContractMock());

  it('Should correctly handle errors', async () => {
    // force errors from this function
    mockedInstallKibanaAssetsAndReferencesMultispace.mockImplementation(async () => {
      throw new Error('mocked async error A: should be caught');
    });

    const installationPromise = stepInstallKibanaAssets({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext: {
        assetsMap: new Map(),
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
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
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });
    await expect(installationPromise).resolves.not.toThrowError();
    await expect(installationPromise).resolves.not.toThrowError();
  });
});

describe('stepInstallKibanaAssetsWithStreaming', () => {
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });

  it('should rely on archiveIterator instead of in-memory assetsMap', async () => {
    const assetsMap = new Map();
    assetsMap.get = jest.fn();
    assetsMap.set = jest.fn();

    const archiveIterator = {
      traverseEntries: jest.fn(),
      getPaths: jest.fn(),
    };

    const result = await stepInstallKibanaAssetsWithStreaming({
      savedObjectsClient: soClient,
      esClient,
      logger: loggerMock.create(),
      packageInstallContext: {
        assetsMap,
        archiveIterator,
        paths: [],
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
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(result).toEqual({ installedKibanaAssetsRefs: [] });

    // Verify that assetsMap was not used
    expect(assetsMap.get).not.toBeCalled();
    expect(assetsMap.set).not.toBeCalled();

    // Verify that archiveIterator was used
    expect(archiveIterator.traverseEntries).toBeCalled();
  });
});

describe('cleanUpKibanaAssetsStep', () => {
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
    mockedDeleteKibanaAssets.mockReset();
  });
  const installedKibana = [{ type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' }];

  it('should clean up kibana assets previously installed', async () => {
    await cleanUpKibanaAssetsStep({
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
          installed_kibana: installedKibana as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'install_kibana_assets' as any,
    });

    expect(mockedDeleteKibanaAssets).toBeCalledWith({
      installedObjects: installedKibana,
      spaceId: 'default',
      packageInfo: packageInstallContext.packageInfo,
    });
  });

  it('should not clean up assets if force is passed', async () => {
    await cleanUpKibanaAssetsStep({
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
          installed_kibana: installedKibana as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      force: true,
      retryFromLastState: true,
      initialState: 'install_kibana_assets' as any,
    });

    expect(mockedDeleteKibanaAssets).not.toBeCalled();
  });

  it('should not clean up assets if retryFromLastState is not passed', async () => {
    await cleanUpKibanaAssetsStep({
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
          installed_kibana: installedKibana as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      initialState: 'install_kibana_assets' as any,
    });

    expect(mockedDeleteKibanaAssets).not.toBeCalled();
  });

  it('should not clean up assets if initialState != install_kibana_assets', async () => {
    await cleanUpKibanaAssetsStep({
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
          installed_kibana: installedKibana as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'create_restart_install' as any,
    });

    expect(mockedDeleteKibanaAssets).not.toBeCalled();
  });

  it('should not clean up assets if attributes are not present', async () => {
    await cleanUpKibanaAssetsStep({
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
      initialState: 'install_kibana_assets' as any,
    });

    expect(mockedDeleteKibanaAssets).not.toBeCalled();
  });
});

describe('cleanUpUnusedKibanaAssetsStep', () => {
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

  const installationContext = {
    savedObjectsClient: soClient,
    savedObjectsImporter: jest.fn(),
    esClient,
    logger: loggerMock.create(),
    packageInstallContext,
    installType: 'install' as const,
    installSource: 'registry' as const,
    spaceId: DEFAULT_SPACE_ID,
    retryFromLastState: true,
    initialState: 'install_kibana_assets' as any,
  };

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });

  it('should not clean up assets if they all present in the new package', async () => {
    const installedAssets = [{ type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' }];
    await cleanUpUnusedKibanaAssetsStep({
      ...installationContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          installed_kibana: installedAssets,
        },
      },
      installedKibanaAssetsRefs: installedAssets,
    });

    expect(mockedDeleteKibanaAssets).not.toBeCalled();
  });

  it('should clean up assets that are not present in the new package', async () => {
    const installedAssets = [
      { type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' },
      { type: KibanaSavedObjectType.dashboard, id: 'dashboard-2' },
    ];
    const newAssets = [{ type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' }];
    await cleanUpUnusedKibanaAssetsStep({
      ...installationContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          installed_kibana: installedAssets,
        },
      },
      installedKibanaAssetsRefs: newAssets,
    });

    expect(mockedDeleteKibanaAssets).toBeCalledWith({
      installedObjects: [installedAssets[1]],
      spaceId: 'default',
      packageInfo: packageInstallContext.packageInfo,
    });
  });
});
