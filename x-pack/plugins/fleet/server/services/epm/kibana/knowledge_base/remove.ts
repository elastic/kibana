/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { KibanaMiscAssetTypes, type MiscAssetReference } from '../../../../types';

export const removeKnowledgeBaseEntries = async ({
  installedObjects,
  savedObjectsClient,
  esClient,
}: {
  installedObjects: MiscAssetReference[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const knowledgeBaseEntryAssets = installedObjects.filter(
    (asset) => asset.type === KibanaMiscAssetTypes.knowledgeBaseEntry
  );

  // TODO
};
