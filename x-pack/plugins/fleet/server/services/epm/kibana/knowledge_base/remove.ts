/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { MiscAssetReference } from '../../../../types';
import { auditLoggingService } from '../../../audit_logging';
import { getSavedObjectId, getIndexName, isKnowledgeBaseEntryReference } from './utils';
import { knowledgeBaseEntrySavedObjectType } from './consts';

export const removeKnowledgeBaseEntries = async ({
  installedObjects,
  savedObjectsClient,
  esClient,
  packageName,
}: {
  installedObjects: MiscAssetReference[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  packageName: string;
}) => {
  const knowledgeBaseEntryAssets = installedObjects.filter(isKnowledgeBaseEntryReference);

  const indicesToDelete = knowledgeBaseEntryAssets.map((entry) => {
    return getIndexName({
      system: entry.system ?? true,
      entryName: entry.id,
      packageName,
    });
  });

  const savedObjectsToDelete = knowledgeBaseEntryAssets.map((entry) => {
    return {
      id: getSavedObjectId({
        entryName: entry.id,
        packageName,
      }),
      type: knowledgeBaseEntrySavedObjectType,
    };
  });

  await esClient.indices.delete(
    {
      index: indicesToDelete,
    },
    { ignore: [404] }
  );

  savedObjectsToDelete.forEach((asset) => {
    auditLoggingService.writeCustomSoAuditLog({
      action: 'delete',
      id: asset.id,
      savedObjectType: knowledgeBaseEntrySavedObjectType,
    });
  });

  await savedObjectsClient.bulkDelete(savedObjectsToDelete, { force: true });
};
