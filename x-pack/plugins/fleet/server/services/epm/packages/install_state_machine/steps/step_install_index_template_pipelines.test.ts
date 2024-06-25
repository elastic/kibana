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
import { installIndexTemplatesAndPipelines } from '../../install_index_template_pipeline';

jest.mock('../../install_index_template_pipeline');

import { stepInstallIndexTemplatePipelines } from './step_install_index_template_pipelines';
const mockedInstallIndexTemplatesAndPipelines =
  installIndexTemplatesAndPipelines as jest.MockedFunction<
    typeof installIndexTemplatesAndPipelines
  >;

describe('stepInstallIndexTemplatePipelines', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
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
    jest.mocked(mockedInstallIndexTemplatesAndPipelines).mockReset();
  });

  it('Should call installIndexTemplatesAndPipelines if packageInfo type is integration', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
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
    const mockInstalledPackageSo = getMockInstalledPackageSo([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
    ]);
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    const res = await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });

    expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledWith({
      installedPkg: installedPkg.attributes,
      packageInstallContext: expect.any(Object),
      esClient: expect.any(Object),
      savedObjectsClient: expect.any(Object),
      logger: expect.any(Object),
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    expect(res).toEqual({
      indexTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
  });

  it('Should call installIndexTemplatesAndPipelines if packageInfo type is input and installedPkg exists', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'template_0001',
            title: 'Template 1',
            description: 'Template 1',
            inputs: [
              {
                type: 'logs',
                title: 'Log',
                description: 'Log Input',
                vars: [
                  {
                    name: 'path',
                    type: 'text',
                  },
                  {
                    name: 'path_2',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      assetsMap: new Map(),
      paths: [],
    };
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
    const mockInstalledPackageSo = getMockInstalledPackageSo([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
      {
        id: 'type-template_0001',
        type: ElasticsearchAssetType.indexTemplate,
      },
    ]);
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    const res = await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'install',
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
      indexTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
  });

  it('Should not call installIndexTemplatesAndPipelines if packageInfo type is input and no data streams are found', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'template_0001',
            title: 'Template 1',
            description: 'Template 1',
            inputs: [
              {
                type: 'logs',
                title: 'Log',
                description: 'Log Input',
                vars: [
                  {
                    name: 'path',
                    type: 'text',
                  },
                  {
                    name: 'path_2',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      assetsMap: new Map(),
      paths: [],
    };
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
    const mockInstalledPackageSo = getMockInstalledPackageSo([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
    ]);
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    expect(mockedInstallIndexTemplatesAndPipelines).not.toBeCalled();
  });

  it('Should not call installIndexTemplatesAndPipelines if packageInfo type is input and installedPkg does not exist', async () => {
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'template_0001',
            title: 'Template 1',
            description: 'Template 1',
            inputs: [
              {
                type: 'logs',
                title: 'Log',
                description: 'Log Input',
                vars: [
                  {
                    name: 'path',
                    type: 'text',
                  },
                  {
                    name: 'path_2',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      assetsMap: new Map(),
      paths: [],
    };
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

    await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    expect(mockedInstallIndexTemplatesAndPipelines).not.toBeCalled();
  });

  it('Should not call installIndexTemplatesAndPipelines if packageInfo type is undefined', async () => {
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: undefined,
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
      } as any,
      assetsMap: new Map(),
      paths: [],
    };
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

    await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [],
    });
    expect(mockedInstallIndexTemplatesAndPipelines).not.toBeCalled();
  });
});
