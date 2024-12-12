/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';

import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';

import { auditLoggingService } from '../../../../audit_logging';
import { packagePolicyService } from '../../../../package_policy';

import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';

import { stepSaveSystemObject } from './step_save_system_object';

jest.mock('../../../../audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

jest.mock('../../../../package_policy');
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

describe('updateLatestExecutedState', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
    soClient.get.mockReset();
    soClient.update.mockReset();
  });

  it('Should save the SO and should not call packagePolicy upgrade if keep_policies_up_to_date = false', async () => {
    soClient.get.mockResolvedValue({
      id: 'test-integration',
      attributes: {
        title: 'title',
        name: 'test-integration',
        version: '1.0.0',
        install_source: 'registry',
        install_status: 'installed',
        package_assets: [],
      },
    } as any);

    await stepSaveSystemObject({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
      packageInstallContext: {
        assetsMap: new Map(),
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
        packageInfo: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
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

    expect(soClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'test-integration',
        {
          install_format_schema_version: '1.3.0',
          install_status: 'installed',
          install_version: '1.0.0',
          latest_install_failed_attempts: [],
          package_assets: undefined,
          version: '1.0.0',
        },
      ],
    ]);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      id: 'test-integration',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    expect(mockedPackagePolicyService.upgrade).not.toBeCalled();
  });

  it('Should call packagePolicy upgrade if keep_policies_up_to_date = true', async () => {
    soClient.get.mockResolvedValue({
      id: 'test-integration',
      attributes: {
        title: 'title',
        name: 'test-integration',
        version: '1.0.0',
        install_source: 'registry',
        install_status: 'installed',
        package_assets: [],
        keep_policies_up_to_date: true,
      },
    } as any);
    mockedPackagePolicyService.listIds.mockReturnValue({
      items: ['packagePolicy1', 'packagePolicy2'],
    } as any);

    await stepSaveSystemObject({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
      packageInstallContext: {
        assetsMap: new Map(),
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
        packageInfo: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
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

    expect(soClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'test-integration',
        {
          install_format_schema_version: '1.3.0',
          install_status: 'installed',
          install_version: '1.0.0',
          latest_install_failed_attempts: [],
          package_assets: undefined,
          version: '1.0.0',
        },
      ],
    ]);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      id: 'test-integration',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    expect(packagePolicyService.upgrade).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      ['packagePolicy1', 'packagePolicy2']
    );
  });
});
