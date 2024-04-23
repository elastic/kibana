/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { Duration } from '../domain/models';
import { computeBurnRate, computeSLI } from '../domain/services';
import { DefaultSLIClient } from './sli_client';
import { SloDefinitionClient } from './slo_definition_client';
import { KibanaSavedObjectsSLORepository } from './slo_repository';

interface Services {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}

interface LookbackWindow {
  name: string;
  duration: Duration;
}

export async function getBurnRates({
  sloId,
  spaceId,
  windows,
  instanceId,
  remoteName,
  services,
}: {
  sloId: string;
  spaceId: string;
  instanceId: string;
  remoteName?: string;
  windows: LookbackWindow[];
  services: Services;
}) {
  const { soClient, esClient, logger } = services;

  const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
  const sliClient = new DefaultSLIClient(esClient);
  const definitionClient = new SloDefinitionClient(repository, esClient, logger);

  const { slo } = await definitionClient.execute(sloId, spaceId, remoteName);

  const sliData = await sliClient.fetchSLIDataFrom(slo, instanceId, windows, remoteName);
  return Object.keys(sliData).map((key) => {
    return {
      name: key,
      burnRate: computeBurnRate(slo, sliData[key]),
      sli: computeSLI(sliData[key].good, sliData[key].total),
    };
  });
}
