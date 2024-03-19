/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SloSettings } from '../domain/models';
import { sloSettingsObjectId, SO_SLO_SETTINGS_TYPE } from '../saved_objects/slo_settings';

export const getSloSettings = async (soClient: SavedObjectsClientContract) => {
  try {
    const object = await soClient.get<SloSettings>(SO_SLO_SETTINGS_TYPE, sloSettingsObjectId);
    return object.attributes;
  } catch (e) {
    return {
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
    };
  }
};

export const getListOfSummaryIndices = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  const indices: string[] = [SLO_SUMMARY_DESTINATION_INDEX_PATTERN];

  const { useAllRemoteClusters, selectedRemoteClusters } = await getSloSettings(soClient);
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return indices;
  }
  const clustersByName = await esClient.cluster.remoteInfo();
  const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];
  clusterNames.forEach((clusterName) => {
    const cluster = clustersByName[clusterName];
    if (
      cluster.connected &&
      (useAllRemoteClusters || selectedRemoteClusters.includes(clusterName))
    ) {
      indices.push(`${clusterName}:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`);
    }
  });

  return indices.join(',');
};
