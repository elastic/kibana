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
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';
import { ElasticsearchAssetType } from '../../../../../types';

import type { EsAssetReference, Installation } from '../../../../../../common';
import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { removeLegacyTemplates } from '../../../elasticsearch/template/remove_legacy';

import { stepRemoveLegacyTemplates } from './step_remove_legacy_templates';

jest.mock('../../../elasticsearch/template/remove_legacy');

const mockedRemoveLegacyTemplates = removeLegacyTemplates as jest.MockedFunction<
  typeof removeLegacyTemplates
>;

describe('stepRemoveLegacyTemplates', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();

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
    jest.mocked(mockedRemoveLegacyTemplates).mockReset();
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

  it('Should call removeLegacyTemplates', async () => {
    await stepRemoveLegacyTemplates({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
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
    expect(mockedRemoveLegacyTemplates).toHaveBeenCalled();
  });

  it('Should catch the error when removeLegacyTemplates fails', async () => {
    jest.mocked(mockedRemoveLegacyTemplates).mockRejectedValue(Error('Error!'));
    await stepRemoveLegacyTemplates({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
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
    expect(mockedRemoveLegacyTemplates).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Error removing legacy templates: Error!');
  });
});
