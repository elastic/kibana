/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  fetchHistoricalSummaryParamsSchema,
  findSLOParamsSchema,
  getSLOParamsSchema,
  updateSLOParamsSchema,
} from '@kbn/slo-schema';
import {
  CreateSLO,
  DefaultResourceInstaller,
  DefaultSummaryClient,
  DefaultTransformManager,
  DeleteSLO,
  FindSLO,
  GetSLO,
  KibanaSavedObjectsSLORepository,
  UpdateSLO,
} from '../../services/slo';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  KQLCustomTransformGenerator,
  TransformGenerator,
} from '../../services/slo/transform_generators';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { DefaultHistoricalSummaryClient } from '../../services/slo/historical_summary_client';
import { FetchHistoricalSummary } from '../../services/slo/fetch_historical_summary';
import type { IndicatorTypes } from '../../domain/models';
import type { ObservabilityRequestHandlerContext } from '../../types';

const transformGenerators: Record<IndicatorTypes, TransformGenerator> = {
  'sli.apm.transactionDuration': new ApmTransactionDurationTransformGenerator(),
  'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
  'sli.kql.custom': new KQLCustomTransformGenerator(),
};

const isLicenseAtLeastPlatinum = async (context: ObservabilityRequestHandlerContext) => {
  return (await context.licensing).license.hasAtLeast('platinum');
};

const createSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos',
  options: {
    tags: [],
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    if (!isLicenseAtLeastPlatinum(context)) {
      throw badRequest('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const resourceInstaller = new DefaultResourceInstaller(esClient, logger);
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const createSLO = new CreateSLO(resourceInstaller, repository, transformManager);

    const response = await createSLO.execute(params.body);

    return response;
  },
});

const updateSLORoute = createObservabilityServerRoute({
  endpoint: 'PUT /api/observability/slos/{id}',
  options: {
    tags: [],
  },
  params: updateSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    if (!isLicenseAtLeastPlatinum(context)) {
      throw badRequest('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const updateSLO = new UpdateSLO(repository, transformManager, esClient);

    const response = await updateSLO.execute(params.path.id, params.body);

    return response;
  },
});

const deleteSLORoute = createObservabilityServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id}',
  options: {
    tags: [],
  },
  params: deleteSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    if (!isLicenseAtLeastPlatinum(context)) {
      throw badRequest('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);

    const deleteSLO = new DeleteSLO(repository, transformManager, esClient);

    await deleteSLO.execute(params.path.id);
  },
});

const getSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos/{id}',
  options: {
    tags: [],
  },
  params: getSLOParamsSchema,
  handler: async ({ context, params }) => {
    if (!isLicenseAtLeastPlatinum(context)) {
      throw badRequest('Platinum license or higher is needed to make use of this feature.');
    }

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const summaryClient = new DefaultSummaryClient(esClient);
    const getSLO = new GetSLO(repository, summaryClient);

    const response = await getSLO.execute(params.path.id);

    return response;
  },
});

const findSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos',
  options: {
    tags: [],
  },
  params: findSLOParamsSchema,
  handler: async ({ context, params }) => {
    if (!isLicenseAtLeastPlatinum(context)) {
      throw badRequest('Platinum license or higher is needed to make use of this feature.');
    }

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const summaryClient = new DefaultSummaryClient(esClient);
    const findSLO = new FindSLO(repository, summaryClient);

    const response = await findSLO.execute(params?.query ?? {});

    return response;
  },
});

const fetchHistoricalSummary = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/_historical_summary',
  options: {
    tags: [],
  },
  params: fetchHistoricalSummaryParamsSchema,
  handler: async ({ context, params }) => {
    if (!isLicenseAtLeastPlatinum(context)) {
      throw badRequest('Platinum license or higher is needed to make use of this feature.');
    }
    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const historicalSummaryClient = new DefaultHistoricalSummaryClient(esClient);

    const fetchSummaryData = new FetchHistoricalSummary(repository, historicalSummaryClient);

    const response = await fetchSummaryData.execute(params.body);

    return response;
  },
});

export const slosRouteRepository = {
  ...createSLORoute,
  ...deleteSLORoute,
  ...findSLORoute,
  ...getSLORoute,
  ...fetchHistoricalSummary,
  ...updateSLORoute,
};
