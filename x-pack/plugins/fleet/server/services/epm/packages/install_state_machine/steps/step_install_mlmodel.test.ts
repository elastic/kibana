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
import { installMlModel } from '../../../elasticsearch/ml_model';
import { deleteMLModels, deletePrerequisiteAssets } from '../../remove';

import { stepInstallMlModel, cleanUpMlModelStep } from './step_install_mlmodel';

jest.mock('../../../elasticsearch/ml_model');
jest.mock('../../remove', () => {
  return {
    ...jest.requireActual('../../remove'),
    deletePrerequisiteAssets: jest.fn(),
    deleteMLModels: jest.fn(),
  };
});

const mockedInstallMlModel = installMlModel as jest.MockedFunction<typeof installMlModel>;
const mockDeleteMLModels = deleteMLModels as jest.MockedFunction<typeof deleteMLModels>;
const mockDeletePrerequisiteAssets = deletePrerequisiteAssets as jest.MockedFunction<
  typeof deletePrerequisiteAssets
>;
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
let soClient: jest.Mocked<SavedObjectsClientContract>;
let esClient: jest.Mocked<ElasticsearchClient>;

describe('stepInstallMlModel', () => {
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
      },
      type: PACKAGES_SAVED_OBJECT_TYPE,
      references: [],
    };
  };
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    jest.mocked(mockedInstallMlModel).mockReset();
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

  it('Should update esReferences', async () => {
    jest.mocked(mockedInstallMlModel).mockResolvedValue([]);
    const res = await stepInstallMlModel({
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
    expect(mockedInstallMlModel).toHaveBeenCalled();
    expect(res.esReferences).toEqual([]);
  });

  it('Should call installTransforms and return updated esReferences', async () => {
    jest.mocked(mockedInstallMlModel).mockResolvedValue([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
    ]);
    const res = await stepInstallMlModel({
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
      esReferences: [],
    });
    expect(mockedInstallMlModel).toHaveBeenCalled();
    expect(res.esReferences).toEqual([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
    ]);
  });
});

describe('cleanUpMlModelStep', () => {
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
    mockDeleteMLModels.mockReset();
    mockDeletePrerequisiteAssets.mockReset();
  });
  const installedEs = [
    {
      id: 'metrics-endpoint.policy-0.1.0-dev.0',
      type: ElasticsearchAssetType.ingestPipeline,
    },
    {
      id: 'endpoint.metadata_current-default-0.1.0',
      type: ElasticsearchAssetType.transform,
    },
    {
      id: 'logs-endpoint.metadata_current-template',
      type: ElasticsearchAssetType.indexTemplate,
      version: '0.2.0',
    },
    {
      id: '.metrics-endpoint.metadata_united_default',
      type: ElasticsearchAssetType.index,
    },
    {
      id: '.metrics-endpoint.metadata_united_default-1',
      type: ElasticsearchAssetType.index,
    },
  ];

  it('should clean up prerequisite assets', async () => {
    await cleanUpMlModelStep({
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
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'install_ml_model' as any,
    });

    expect(mockDeletePrerequisiteAssets).toBeCalledWith(
      {
        indexAssets: [
          {
            id: '.metrics-endpoint.metadata_united_default',
            type: ElasticsearchAssetType.index,
          },
          {
            id: '.metrics-endpoint.metadata_united_default-1',
            type: ElasticsearchAssetType.index,
          },
        ],
        transformAssets: [
          {
            id: 'endpoint.metadata_current-default-0.1.0',
            type: ElasticsearchAssetType.transform,
          },
        ],
        indexTemplatesAndPipelines: [
          {
            id: 'metrics-endpoint.policy-0.1.0-dev.0',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-endpoint.metadata_current-template',
            type: ElasticsearchAssetType.indexTemplate,
            version: '0.2.0',
          },
        ],
      },
      esClient
    );
    expect(mockDeleteMLModels).toBeCalledWith(installedEs, esClient);
  });

  it('should not clean up assets if force is passed', async () => {
    await cleanUpMlModelStep({
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
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      force: true,
      retryFromLastState: true,
      initialState: 'install_ml_model' as any,
    });

    expect(mockDeleteMLModels).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });

  it('should not clean up assets if retryFromLastState is not passed', async () => {
    await cleanUpMlModelStep({
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
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      initialState: 'install_ml_model' as any,
    });

    expect(mockDeleteMLModels).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });

  it('should not clean up assets if initialState != install_ml_model', async () => {
    await cleanUpMlModelStep({
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
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'create_restart_install' as any,
    });

    expect(mockDeleteMLModels).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });

  it('should not clean up assets if attributes are not present', async () => {
    await cleanUpMlModelStep({
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
      initialState: 'install_ml_model' as any,
    });

    expect(mockDeleteMLModels).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });
});
