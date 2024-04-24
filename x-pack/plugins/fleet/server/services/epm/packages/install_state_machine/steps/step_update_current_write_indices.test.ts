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

import type { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';

import type { EsAssetReference, Installation } from '../../../../../../common';
import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { updateCurrentWriteIndices } from '../../../elasticsearch/template/template';

import { stepUpdateCurrentWriteIndices } from './step_update_current_write_indices';

jest.mock('../../../elasticsearch/template/template');

const mockedUpdateCurrentWriteIndices = updateCurrentWriteIndices as jest.MockedFunction<
  typeof updateCurrentWriteIndices
>;

const createMockTemplate = ({ name, composedOf = [] }: { name: string; composedOf?: string[] }) =>
  ({
    name,
    index_template: {
      composed_of: composedOf,
    },
  } as IndicesGetIndexTemplateIndexTemplateItem);

describe('stepUpdateCurrentWriteIndices', () => {
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
        data_streams: [],
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
    jest.mocked(mockedUpdateCurrentWriteIndices).mockReset();
  });

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

  it('Should call updateCurrentWriteIndices', async () => {
    await stepUpdateCurrentWriteIndices({
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
      esReferences: [],
    });

    expect(mockedUpdateCurrentWriteIndices).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [],
      { ignoreMappingUpdateErrors: undefined, skipDataStreamRollover: undefined }
    );
  });

  it('Should call updateCurrentWriteIndices with passed parameters', async () => {
    const indexTemplates = [createMockTemplate({ name: 'tmpl1' })] as any;
    await stepUpdateCurrentWriteIndices({
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
      esReferences: [],
      indexTemplates,
      ignoreMappingUpdateErrors: true,
      skipDataStreamRollover: true,
    });

    expect(mockedUpdateCurrentWriteIndices).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      indexTemplates,
      { ignoreMappingUpdateErrors: true, skipDataStreamRollover: true }
    );
  });
});
