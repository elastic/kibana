/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { KibanaMiscAssetTypes, type MiscAssetReference } from '../../../../types';
import { auditLoggingService } from '../../../audit_logging';
import { knowledgeBaseEntrySavedObjectType } from './consts';
import { removeKnowledgeBaseEntries } from './remove';

jest.mock('../../../audit_logging');

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('removeKnowledgeBaseEntries', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  const installedAssets: MiscAssetReference[] = [
    {
      type: KibanaMiscAssetTypes.knowledgeBaseEntry,
      id: 'kb-entry-1',
    },
    {
      type: KibanaMiscAssetTypes.knowledgeBaseEntry,
      id: 'kb-entry-2',
    },
  ];

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    savedObjectsClient = savedObjectsClientMock.create();

    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
  });

  it('calls esClient.indices.delete with the right parameters', async () => {
    await removeKnowledgeBaseEntries({
      installedObjects: installedAssets,
      packageName: 'my-package',
      esClient,
      savedObjectsClient,
    });

    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      { index: ['.kibana-my-package_kb-entry-1', '.kibana-my-package_kb-entry-2'] },
      { ignore: [404] }
    );
  });

  it('calls auditLoggingService.writeCustomSoAuditLog once per entry', async () => {
    await removeKnowledgeBaseEntries({
      installedObjects: installedAssets,
      packageName: 'my-package',
      esClient,
      savedObjectsClient,
    });

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledTimes(2);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'delete',
      id: 'entry_my-package_kb-entry-1',
      savedObjectType: knowledgeBaseEntrySavedObjectType,
    });
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'delete',
      id: 'entry_my-package_kb-entry-2',
      savedObjectType: knowledgeBaseEntrySavedObjectType,
    });
  });

  it('calls soClient.bulkDelete with the right parameters', async () => {
    await removeKnowledgeBaseEntries({
      installedObjects: installedAssets,
      packageName: 'my-package',
      esClient,
      savedObjectsClient,
    });

    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(
      [
        { id: 'entry_my-package_kb-entry-1', type: knowledgeBaseEntrySavedObjectType },
        { id: 'entry_my-package_kb-entry-2', type: knowledgeBaseEntrySavedObjectType },
      ],
      { force: true }
    );
  });
});
