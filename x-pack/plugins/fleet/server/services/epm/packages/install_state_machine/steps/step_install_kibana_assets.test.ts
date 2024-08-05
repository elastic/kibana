/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { installKibanaAssetsAndReferencesMultispace } from '../../../kibana/assets/install';

jest.mock('../../../kibana/assets/install');

import { stepInstallKibanaAssets } from './step_install_kibana_assets';

const mockedInstallKibanaAssetsAndReferencesMultispace = jest.mocked(
  installKibanaAssetsAndReferencesMultispace
);

describe('stepInstallKibanaAssets', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;

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
