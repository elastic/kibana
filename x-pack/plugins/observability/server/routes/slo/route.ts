/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { failedDependency, forbidden } from '@hapi/boom';
import {
  createSLOParamsSchema,
  deleteSLOInstancesParamsSchema,
  deleteSLOParamsSchema,
  fetchHistoricalSummaryParamsSchema,
  findSloDefinitionsParamsSchema,
  findSLOParamsSchema,
  getPreviewDataParamsSchema,
  getSLOBurnRatesParamsSchema,
  getSLOInstancesParamsSchema,
  getSLOParamsSchema,
  manageSLOParamsSchema,
  resetSLOParamsSchema,
  updateSLOParamsSchema,
} from '@kbn/slo-schema';
import type { IndicatorTypes } from '../../domain/models';
import {
  CreateSLO,
  DefaultSummaryClient,
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  DeleteSLO,
  DeleteSLOInstances,
  FindSLO,
  GetSLO,
  KibanaSavedObjectsSLORepository,
  UpdateSLO,
} from '../../services/slo';
import { FetchHistoricalSummary } from '../../services/slo/fetch_historical_summary';
import { FindSLODefinitions } from '../../services/slo/find_slo_definitions';
import { getBurnRates } from '../../services/slo/get_burn_rates';
import { getGlobalDiagnosis } from '../../services/slo/get_diagnosis';
import { GetPreviewData } from '../../services/slo/get_preview_data';
import { GetSLOInstances } from '../../services/slo/get_slo_instances';
import { DefaultHistoricalSummaryClient } from '../../services/slo/historical_summary_client';
import { ManageSLO } from '../../services/slo/manage_slo';
import { ResetSLO } from '../../services/slo/reset_slo';
import { DefaultSummarySearchClient } from '../../services/slo/summary_search_client';
import { DefaultSummaryTransformGenerator } from '../../services/slo/summary_transform_generator/summary_transform_generator';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  HistogramTransformGenerator,
  KQLCustomTransformGenerator,
  MetricCustomTransformGenerator,
  TimesliceMetricTransformGenerator,
  TransformGenerator,
} from '../../services/slo/transform_generators';
import type { ObservabilityRequestHandlerContext } from '../../types';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const transformGenerators: Record<IndicatorTypes, TransformGenerator> = {
  'sli.apm.transactionDuration': new ApmTransactionDurationTransformGenerator(),
  'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
  'sli.kql.custom': new KQLCustomTransformGenerator(),
  'sli.metric.custom': new MetricCustomTransformGenerator(),
  'sli.histogram.custom': new HistogramTransformGenerator(),
  'sli.metric.timeslice': new TimesliceMetricTransformGenerator(),
};

const assertPlatinumLicense = async (context: ObservabilityRequestHandlerContext) => {
  const licensing = await context.licensing;
  const hasCorrectLicense = licensing.license.hasAtLeast('platinum');

  if (!hasCorrectLicense) {
    throw forbidden('Platinum license or higher is needed to make use of this feature.');
  }
};

const createSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger, dependencies, request }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const createSLO = new CreateSLO(
      esClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId
    );

    const response = await createSLO.execute(params.body);

    return response;
  },
});

const inspectSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /internal/api/observability/slos/_inspect 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger, dependencies, request }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const createSLO = new CreateSLO(
      esClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId
    );

    return createSLO.inspect(params.body);
  },
});

const updateSLORoute = createObservabilityServerRoute({
  endpoint: 'PUT /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: updateSLOParamsSchema,
  handler: async ({ context, request, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const updateSLO = new UpdateSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      logger,
      spaceId
    );

    const response = await updateSLO.execute(params.path.id, params.body);

    return response;
  },
});

const deleteSLORoute = createObservabilityServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: deleteSLOParamsSchema,
  handler: async ({
    request,
    context,
    params,
    logger,
    dependencies: { getRulesClientWithRequest },
  }) => {
    await assertPlatinumLicense(context);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const rulesClient = getRulesClientWithRequest(request);

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);

    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const deleteSLO = new DeleteSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      rulesClient
    );

    await deleteSLO.execute(params.path.id);
  },
});

const getSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_read'],
    access: 'public',
  },
  params: getSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const summaryClient = new DefaultSummaryClient(esClient);
    const getSLO = new GetSLO(repository, summaryClient);

    const response = await getSLO.execute(params.path.id, params.query);

    return response;
  },
});

const enableSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/enable 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: manageSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const manageSLO = new ManageSLO(repository, transformManager, summaryTransformManager);

    const response = await manageSLO.enable(params.path.id);

    return response;
  },
});

const disableSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/disable 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: manageSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const manageSLO = new ManageSLO(repository, transformManager, summaryTransformManager);

    const response = await manageSLO.disable(params.path.id);

    return response;
  },
});

const resetSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/_reset 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: resetSLOParamsSchema,
  handler: async ({ context, request, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';
    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      logger
    );

    const resetSLO = new ResetSLO(
      esClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId
    );

    const response = await resetSLO.execute(params.path.id);

    return response;
  },
});

const findSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos 2023-10-31',
  options: {
    tags: ['access:slo_read'],
    access: 'public',
  },
  params: findSLOParamsSchema,
  handler: async ({ context, request, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const summarySearchClient = new DefaultSummarySearchClient(esClient, logger, spaceId);
    const findSLO = new FindSLO(repository, summarySearchClient);

    const response = await findSLO.execute(params?.query ?? {});

    return response;
  },
});

const deleteSloInstancesRoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos/_delete_instances 2023-10-31',
  options: {
    tags: ['access:slo_write'],
  },
  params: deleteSLOInstancesParamsSchema,
  handler: async ({ context, params }) => {
    await assertPlatinumLicense(context);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const deleteSloInstances = new DeleteSLOInstances(esClient);

    await deleteSloInstances.execute(params.body);
  },
});

const findSloDefinitionsRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos/_definitions 2023-10-31',
  options: {
    tags: ['access:slo_read'],
  },
  params: findSloDefinitionsParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const findSloDefinitions = new FindSLODefinitions(repository);

    const response = await findSloDefinitions.execute(params?.query ?? {});

    return response;
  },
});

const fetchHistoricalSummary = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/_historical_summary',
  options: {
    tags: ['access:slo_read'],
  },
  params: fetchHistoricalSummaryParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const historicalSummaryClient = new DefaultHistoricalSummaryClient(esClient);

    const fetchSummaryData = new FetchHistoricalSummary(repository, historicalSummaryClient);

    const response = await fetchSummaryData.execute(params.body);

    return response;
  },
});

const getSLOInstancesRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_instances',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: getSLOInstancesParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const getSLOInstances = new GetSLOInstances(repository, esClient);

    const response = await getSLOInstances.execute(params.path.id);

    return response;
  },
});

const getDiagnosisRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/slos/_diagnosis',
  options: {
    tags: [],
    access: 'internal',
  },
  params: undefined,
  handler: async ({ context }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const licensing = await context.licensing;

    try {
      const response = await getGlobalDiagnosis(esClient, licensing);
      return response;
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 403) {
        throw forbidden('Insufficient Elasticsearch cluster permissions to access feature.');
      }
      throw failedDependency(error);
    }
  },
});

const getSloBurnRates = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/{id}/_burn_rates',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: getSLOBurnRatesParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const burnRates = await getBurnRates(
      params.path.id,
      params.body.instanceId,
      params.body.windows,
      {
        soClient,
        esClient,
        logger,
      }
    );
    return { burnRates };
  },
});

const getPreviewData = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/_preview',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: getPreviewDataParamsSchema,
  handler: async ({ context, params }) => {
    await assertPlatinumLicense(context);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const service = new GetPreviewData(esClient);
    return await service.execute(params.body);
  },
});

export const sloRouteRepository = {
  ...createSLORoute,
  ...inspectSLORoute,
  ...deleteSLORoute,
  ...deleteSloInstancesRoute,
  ...disableSLORoute,
  ...enableSLORoute,
  ...fetchHistoricalSummary,
  ...findSloDefinitionsRoute,
  ...findSLORoute,
  ...getSLORoute,
  ...updateSLORoute,
  ...getDiagnosisRoute,
  ...getSloBurnRates,
  ...getPreviewData,
  ...getSLOInstancesRoute,
  ...resetSLORoute,
};
