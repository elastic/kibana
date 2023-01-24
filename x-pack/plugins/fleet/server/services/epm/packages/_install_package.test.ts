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

import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';

jest.mock('../elasticsearch/template/template');
jest.mock('../kibana/assets/install');
jest.mock('../kibana/index_pattern/install');
jest.mock('./install');
jest.mock('./get');

import { updateCurrentWriteIndices } from '../elasticsearch/template/template';
import { installKibanaAssetsAndReferences } from '../kibana/assets/install';

import { installIndexTemplatesAndPipelines } from './install';

import { _installPackage } from './_install_package';

const mockedInstallIndexTemplatesAndPipelines =
  installIndexTemplatesAndPipelines as jest.MockedFunction<
    typeof installIndexTemplatesAndPipelines
  >;
const mockedUpdateCurrentWriteIndices = updateCurrentWriteIndices as jest.MockedFunction<
  typeof updateCurrentWriteIndices
>;
const mockedInstallKibanaAssetsAndReferences =
  installKibanaAssetsAndReferences as jest.MockedFunction<typeof installKibanaAssetsAndReferences>;

function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

describe('_installPackage', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    appContextService.stop();
  });
  it('handles errors from  installKibanaAssets', async () => {
    // force errors from this function
    mockedInstallKibanaAssetsAndReferences.mockImplementation(async () => {
      throw new Error('mocked async error A: should be caught');
    });

    // pick any function between when those are called and when await Promise.all is defined later
    // and force it to take long enough for the errors to occur
    // @ts-expect-error about call signature
    mockedUpdateCurrentWriteIndices.mockImplementation(async () => await sleep(1000));
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [],
      esReferences: [],
    });
    const installationPromise = _installPackage({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
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
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    // if we have a .catch this will fail nicely (test pass)
    // otherwise the test will fail with either of the mocked errors
    await expect(installationPromise).rejects.toThrow('mocked');
    await expect(installationPromise).rejects.toThrow('should be caught');
  });
});
