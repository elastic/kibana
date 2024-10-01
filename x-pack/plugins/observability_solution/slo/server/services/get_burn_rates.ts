/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOBurnRatesResponse } from '@kbn/slo-schema';
import { SloRouteContext } from '../types';
import { Duration } from '../domain/models';
import { DefaultBurnRatesClient } from './burn_rates_client';
import { SloDefinitionClient } from './slo_definition_client';

interface LookbackWindow {
  name: string;
  duration: Duration;
}

interface Params {
  sloId: string;
  instanceId: string;
  remoteName?: string;
  windows: LookbackWindow[];
  context: SloRouteContext;
}

export async function getBurnRates({
  sloId,
  windows,
  instanceId,
  remoteName,
  context,
}: Params): Promise<GetSLOBurnRatesResponse> {
  const { esClient, spaceId } = context;

  const burnRatesClient = new DefaultBurnRatesClient(esClient);
  const definitionClient = new SloDefinitionClient(context);

  const { slo } = await definitionClient.execute(sloId, spaceId, remoteName);
  const burnRates = await burnRatesClient.calculate(slo, instanceId, windows, remoteName);

  return { burnRates };
}
