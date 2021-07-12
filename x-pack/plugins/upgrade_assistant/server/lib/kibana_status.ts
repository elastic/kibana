/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsServiceStart, IScopedClusterClient } from 'kibana/server';
import { DomainDeprecationDetails, SavedObjectsClientContract } from 'src/core/server/types';

export const getKibanaUpgradeStatus = async ({
  getDeprecationsService,
  esClient,
  savedObjectsClient,
}: {
  getDeprecationsService: () => Promise<DeprecationsServiceStart>;
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const deprecationsService = await getDeprecationsService();
  const kibanaDeprecations: DomainDeprecationDetails[] = await deprecationsService.getAllDeprecations(
    { esClient, savedObjectsClient }
  );

  const totalCriticalDeprecations = kibanaDeprecations.filter((d) => d.level === 'critical').length;

  return {
    totalCriticalDeprecations,
  };
};
