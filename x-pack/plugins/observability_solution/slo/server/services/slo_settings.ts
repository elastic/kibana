/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { getListOfSloSummaryIndices } from '../../common/summary_indices';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SloSettings } from '../domain/models';
import { sloSettingsObjectId, SO_SLO_SETTINGS_TYPE } from '../saved_objects/slo_settings';

export const getSloSettings = async (soClient: SavedObjectsClientContract) => {
  try {
    const soObject = await soClient.get<SloSettings>(SO_SLO_SETTINGS_TYPE, sloSettingsObjectId);
    return soObject.attributes;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return {
        useAllRemoteClusters: true,
        selectedRemoteClusters: [],
      };
    }
    throw e;
  }
};

export const getListOfSummaryIndices = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  const indices: string[] = [SLO_SUMMARY_DESTINATION_INDEX_PATTERN];

  const settings = await getSloSettings(soClient);
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return indices;
  }

  const clustersByName = await esClient.cluster.remoteInfo();
  const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];
  const clusterInfo = clusterNames.map((clusterName) => ({
    name: clusterName,
    isConnected: clustersByName[clusterName].connected,
  }));

  return getListOfSloSummaryIndices(settings, clusterInfo);
};
