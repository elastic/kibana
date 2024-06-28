/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  SavedObjectsClientContract,
  ElasticsearchClient,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import {
  MAX_TIME_COMPLETE_INSTALL,
  PACKAGES_SAVED_OBJECT_TYPE,
} from '../../../../../../common/constants';

import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';

import { INSTALL_STATES } from '../../../../../../common/types';

import { auditLoggingService } from '../../../../audit_logging';

import type { PackagePolicySOAttributes } from '../../../../../types';

import { updateLatestExecutedState } from './update_latest_executed_state';

jest.mock('../../../../audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

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
    soClient.update.mockReset();
  });

  it('Should update the SO if there was an error on latest step', async () => {
    await updateLatestExecutedState({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
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
      latestExecutedState: {
        name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
        started_at: new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL * 2).toISOString(),
        error: `Some error`,
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(soClient.update.mock.calls).toEqual(
      expect.objectContaining([
        [
          'epm-packages',
          'xyz',
          {
            latest_executed_state: {
              name: 'save_archive_entries_from_assets_map',
              error: 'Some error',
              started_at: expect.anything(),
            },
          },
        ],
      ])
    );
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      id: 'xyz',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  });

  it('Should not update the SO if the latest error was of type concurrent installation', async () => {
    await updateLatestExecutedState({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
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
      latestExecutedState: {
        name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
        started_at: new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL * 2).toISOString(),
        error: `Concurrent installation or upgrade of xyz-4.5.6 detected.`,
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(soClient.update.mock.calls).toEqual([]);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).not.toHaveBeenCalled();
  });

  it('Should not update the SO if there was no error', async () => {
    await updateLatestExecutedState({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
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
      latestExecutedState: {
        name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
        started_at: new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL * 2).toISOString(),
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(soClient.update.mock.calls).toEqual([]);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).not.toHaveBeenCalled();
  });

  it('Should log error if the SO update failed', async () => {
    soClient.update.mockImplementation(
      async (
        _type: string,
        _id: string
      ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
        throw SavedObjectsErrorHelpers.createConflictError('abc', '123');
      }
    );

    await updateLatestExecutedState({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
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
      latestExecutedState: {
        name: INSTALL_STATES.SAVE_ARCHIVE_ENTRIES,
        started_at: new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL * 2).toISOString(),
        error: `Some error`,
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      id: 'xyz',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update SO with latest executed state: Error: Saved object [abc/123] conflict'
    );
  });
});
