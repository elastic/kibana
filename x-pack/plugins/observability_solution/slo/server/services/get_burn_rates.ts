/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { GetSLOBurnRatesResponse } from '@kbn/slo-schema';
import { Duration } from '../domain/models';
import { DefaultBurnRatesClient } from './burn_rates_client';
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

interface Params {
  sloId: string;
  spaceId: string;
  instanceId: string;
  remoteName?: string;
  windows: LookbackWindow[];
  services: Services;
}

export async function getBurnRates({
  sloId,
  spaceId,
  windows,
  instanceId,
  remoteName,
  services,
}: Params): Promise<GetSLOBurnRatesResponse> {
  const { soClient, esClient, logger } = services;

  const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
  const burnRatesClient = new DefaultBurnRatesClient(esClient);
  const definitionClient = new SloDefinitionClient(repository, esClient, logger);

  const { slo } = await definitionClient.execute(sloId, spaceId, remoteName);
  const burnRates = await burnRatesClient.calculate(slo, instanceId, windows, remoteName);

  return { burnRates };
}
