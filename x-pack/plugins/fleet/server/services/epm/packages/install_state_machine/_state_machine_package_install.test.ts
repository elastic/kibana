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

import {
  PackageSavedObjectConflictError,
  ConcurrentInstallOperationError,
} from '../../../../errors';

import type { Installation } from '../../../../../common';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';

import { appContextService } from '../../../app_context';
import { createAppContextStartContractMock } from '../../../../mocks';
import { saveArchiveEntriesFromAssetsMap } from '../../archive/storage';
import { installILMPolicy } from '../../elasticsearch/ilm/install';
import { installIlmForDataStream } from '../../elasticsearch/datastream_ilm/install';

jest.mock('../../elasticsearch/template/template');
jest.mock('../../kibana/assets/install');
jest.mock('../../kibana/index_pattern/install');
jest.mock('../install');
jest.mock('../get');
jest.mock('../install_index_template_pipeline');

jest.mock('../../archive/storage');
jest.mock('../../elasticsearch/ilm/install');
jest.mock('../../elasticsearch/datastream_ilm/install');

import { updateCurrentWriteIndices } from '../../elasticsearch/template/template';
import { installKibanaAssetsAndReferences } from '../../kibana/assets/install';

import { MAX_TIME_COMPLETE_INSTALL } from '../../../../../common/constants';

import { restartInstallation } from '../install';
import { installIndexTemplatesAndPipelines } from '../install_index_template_pipeline';

import { _stateMachineInstallPackage } from './_state_machine_package_install';

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

describe('_stateMachineInstallPackage', () => {
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

    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
    jest.mocked(installILMPolicy).mockReset();
    jest.mocked(installIlmForDataStream).mockReset();
    jest.mocked(installIlmForDataStream).mockResolvedValue({
      esReferences: [],
      installedIlms: [],
    });
    jest.mocked(saveArchiveEntriesFromAssetsMap).mockResolvedValue({
      saved_objects: [],
    });
    jest.mocked(restartInstallation).mockReset();
  });

  it('Handles errors from installKibanaAssets', async () => {
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

    const installationPromise = _stateMachineInstallPackage({
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
    // if we have a .catch this will fail nicely (test pass)
    // otherwise the test will fail with either of the mocked errors
    await expect(installationPromise).rejects.toThrow('mocked');
    await expect(installationPromise).rejects.toThrow('should be caught');
  });

  it('Do not install ILM policies if disabled in config', async () => {
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
    // force errors from this function
    mockedInstallKibanaAssetsAndReferences.mockResolvedValue([]);
    // pick any function between when those are called and when await Promise.all is defined later
    // and force it to take long enough for the errors to occur
    // @ts-expect-error about call signature
    mockedUpdateCurrentWriteIndices.mockImplementation(async () => await sleep(1000));
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [],
      esReferences: [],
    });
    await _stateMachineInstallPackage({
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

    expect(installILMPolicy).not.toBeCalled();
    expect(installIlmForDataStream).not.toBeCalled();
  });

  it('Installs ILM policies if not disabled in config', async () => {
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
    // force errors from this function
    mockedInstallKibanaAssetsAndReferences.mockResolvedValue([]);
    // pick any function between when those are called and when await Promise.all is defined later
    // and force it to take long enough for the errors to occur
    // @ts-expect-error about call signature
    mockedUpdateCurrentWriteIndices.mockImplementation(async () => await sleep(1000));
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [],
      esReferences: [],
    });
    await _stateMachineInstallPackage({
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

    expect(installILMPolicy).toBeCalled();
    expect(installIlmForDataStream).toBeCalled();
  });

  describe('When package is stuck in `installing`', () => {
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
        es_index_patterns: [],
      },
      type: PACKAGES_SAVED_OBJECT_TYPE,
      references: [],
    };

    beforeEach(() => {
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
    });

    describe('When timeout is reached', () => {
      it('restarts installation', async () => {
        await _stateMachineInstallPackage({
          savedObjectsClient: soClient,
          // @ts-ignore
          savedObjectsImporter: jest.fn(),
          esClient,
          logger: loggerMock.create(),
          packageInstallContext: {
            paths: [],
            assetsMap: new Map(),
            packageInfo: {
              name: mockInstalledPackageSo.attributes.name,
              version: mockInstalledPackageSo.attributes.version,
              title: mockInstalledPackageSo.attributes.name,
            } as any,
          },
          installedPkg: {
            ...mockInstalledPackageSo,
            attributes: {
              ...mockInstalledPackageSo.attributes,
              install_started_at: new Date(
                Date.now() - MAX_TIME_COMPLETE_INSTALL * 2
              ).toISOString(),
            },
          },
        });

        expect(restartInstallation).toBeCalled();
      });
    });

    describe('When timeout is not reached', () => {
      describe('With no force flag', () => {
        it('throws concurrent installation error', async () => {
          const installPromise = _stateMachineInstallPackage({
            savedObjectsClient: soClient,
            // @ts-ignore
            savedObjectsImporter: jest.fn(),
            esClient,
            logger: loggerMock.create(),
            packageInstallContext: {
              paths: [],
              assetsMap: new Map(),
              packageInfo: {
                name: mockInstalledPackageSo.attributes.name,
                version: mockInstalledPackageSo.attributes.version,
                title: mockInstalledPackageSo.attributes.name,
              } as any,
            },
            installedPkg: {
              ...mockInstalledPackageSo,
              attributes: {
                ...mockInstalledPackageSo.attributes,
                install_started_at: new Date(Date.now() - 1000).toISOString(),
              },
            },
          });

          await expect(installPromise).rejects.toThrowError(ConcurrentInstallOperationError);
        });
      });

      describe('With force flag provided', () => {
        it('restarts installation', async () => {
          await _stateMachineInstallPackage({
            savedObjectsClient: soClient,
            // @ts-ignore
            savedObjectsImporter: jest.fn(),
            esClient,
            logger: loggerMock.create(),
            packageInstallContext: {
              paths: [],
              assetsMap: new Map(),
              packageInfo: {
                name: mockInstalledPackageSo.attributes.name,
                version: mockInstalledPackageSo.attributes.version,
                title: mockInstalledPackageSo.attributes.name,
              } as any,
            },
            installedPkg: {
              ...mockInstalledPackageSo,
              attributes: {
                ...mockInstalledPackageSo.attributes,
                install_started_at: new Date(Date.now() - 1000).toISOString(),
              },
            },
            force: true,
          });

          expect(restartInstallation).toBeCalled();
        });
      });
    });
  });

  it('Surfaces saved object conflicts error', async () => {
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

    mockedInstallKibanaAssetsAndReferences.mockRejectedValueOnce(
      new PackageSavedObjectConflictError('test')
    );

    const installPromise = _stateMachineInstallPackage({
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
    await expect(installPromise).rejects.toThrowError(PackageSavedObjectConflictError);
  });
});
