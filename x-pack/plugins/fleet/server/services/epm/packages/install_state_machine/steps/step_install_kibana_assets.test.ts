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

import { stepInstallKibanaAssets, cleanUpKibanaAssetsStep } from './step_install_kibana_assets';

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
    expect(mockedInstallKibanaAssetsAndReferencesMultispace).toBeCalledTimes(1);
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
