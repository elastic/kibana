/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { DefaultSLIClient } from './sli_client';
import { Duration } from '../../domain/models';
import { computeSLI, computeBurnRate } from '../../domain/services';

interface Services {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}

interface LookbackWindow {
  name: string;
  duration: Duration;
}

export async function getBurnRates(
  sloId: string,
  instanceId: string,
  windows: LookbackWindow[],
  services: Services
) {
  const { soClient, esClient } = services;

  const repository = new KibanaSavedObjectsSLORepository(soClient);
  const sliClient = new DefaultSLIClient(esClient);
  const slo = await repository.findById(sloId);

  const sliData = await sliClient.fetchSLIDataFrom(slo, instanceId, windows);
  return Object.keys(sliData).map((key) => {
    return {
      name: key,
      burnRate: computeBurnRate(slo, sliData[key]),
      sli: computeSLI(sliData[key].good, sliData[key].total),
    };
  });
}
