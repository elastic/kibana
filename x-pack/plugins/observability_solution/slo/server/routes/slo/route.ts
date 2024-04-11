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
  findSLOGroupsParamsSchema,
  findSLOParamsSchema,
  getPreviewDataParamsSchema,
  getSLOBurnRatesParamsSchema,
  getSLOInstancesParamsSchema,
  getSLOParamsSchema,
  manageSLOParamsSchema,
  putSLOSettingsParamsSchema,
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
  FindSLOGroups,
  GetSLO,
  KibanaSavedObjectsSLORepository,
  UpdateSLO,
} from '../../services';
import { FetchHistoricalSummary } from '../../services/fetch_historical_summary';
import { FindSLODefinitions } from '../../services/find_slo_definitions';
import { getBurnRates } from '../../services/get_burn_rates';
import { getGlobalDiagnosis } from '../../services/get_diagnosis';
import { GetPreviewData } from '../../services/get_preview_data';
import { GetSLOInstances } from '../../services/get_slo_instances';
import { DefaultHistoricalSummaryClient } from '../../services/historical_summary_client';
import { ManageSLO } from '../../services/manage_slo';
import { ResetSLO } from '../../services/reset_slo';
import { SloDefinitionClient } from '../../services/slo_definition_client';
import { getSloSettings, storeSloSettings } from '../../services/slo_settings';
import { DefaultSummarySearchClient } from '../../services/summary_search_client';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  HistogramTransformGenerator,
  KQLCustomTransformGenerator,
  MetricCustomTransformGenerator,
  SyntheticsAvailabilityTransformGenerator,
  TimesliceMetricTransformGenerator,
  TransformGenerator,
} from '../../services/transform_generators';
import type { SloRequestHandlerContext } from '../../types';
import { createSloServerRoute } from '../create_slo_server_route';

const transformGenerators: Record<IndicatorTypes, TransformGenerator> = {
  'sli.apm.transactionDuration': new ApmTransactionDurationTransformGenerator(),
  'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
  'sli.synthetics.availability': new SyntheticsAvailabilityTransformGenerator(),
  'sli.kql.custom': new KQLCustomTransformGenerator(),
  'sli.metric.custom': new MetricCustomTransformGenerator(),
  'sli.histogram.custom': new HistogramTransformGenerator(),
  'sli.metric.timeslice': new TimesliceMetricTransformGenerator(),
};

const assertPlatinumLicense = async (context: SloRequestHandlerContext) => {
  const licensing = await context.licensing;
  const hasCorrectLicense = licensing.license.hasAtLeast('platinum');

  if (!hasCorrectLicense) {
    throw forbidden('Platinum license or higher is needed to make use of this feature.');
  }
};

const createSLORoute = createSloServerRoute({
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
    const basePath = dependencies.pluginsSetup.core.http.basePath;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
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
      spaceId,
      basePath
    );

    const response = await createSLO.execute(params.body);

    return response;
  },
});

const inspectSLORoute = createSloServerRoute({
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
    const basePath = dependencies.pluginsSetup.core.http.basePath;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
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
      spaceId,
      basePath
    );

    return createSLO.inspect(params.body);
  },
});

const updateSLORoute = createSloServerRoute({
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

    const basePath = dependencies.pluginsSetup.core.http.basePath;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
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
      spaceId,
      basePath
    );

    const response = await updateSLO.execute(params.path.id, params.body);

    return response;
  },
});

const deleteSLORoute = createSloServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: deleteSLOParamsSchema,
  handler: async ({ request, context, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const rulesClient = dependencies.getRulesClientWithRequest(request);

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );

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

const getSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_read'],
    access: 'public',
  },
  params: getSLOParamsSchema,
  handler: async ({ request, context, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const summaryClient = new DefaultSummaryClient(esClient);
    const defintionClient = new SloDefinitionClient(repository, esClient, logger);
    const getSLO = new GetSLO(defintionClient, summaryClient);

    return await getSLO.execute(params.path.id, spaceId, params.query);
  },
});

const enableSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/enable 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: manageSLOParamsSchema,
  handler: async ({ request, context, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
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

const disableSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/disable 2023-10-31',
  options: {
    tags: ['access:slo_write'],
    access: 'public',
  },
  params: manageSLOParamsSchema,
  handler: async ({ request, context, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
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

const resetSLORoute = createSloServerRoute({
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
    const basePath = dependencies.pluginsSetup.core.http.basePath;

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
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
      spaceId,
      basePath
    );

    const response = await resetSLO.execute(params.path.id);

    return response;
  },
});

const findSLORoute = createSloServerRoute({
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
    const summarySearchClient = new DefaultSummarySearchClient(esClient, soClient, logger, spaceId);

    const findSLO = new FindSLO(repository, summarySearchClient);

    return await findSLO.execute(params?.query ?? {});
  },
});

const findSLOGroupsRoute = createSloServerRoute({
  endpoint: 'GET /internal/api/observability/slos/_groups',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: findSLOGroupsParamsSchema,
  handler: async ({ context, request, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);
    const spaceId =
      (await dependencies.spaces?.spacesService.getActiveSpace(request))?.id ?? 'default';
    const soClient = (await context.core).savedObjects.client;
    const coreContext = context.core;
    const esClient = (await coreContext).elasticsearch.client.asCurrentUser;
    const findSLOGroups = new FindSLOGroups(esClient, soClient, logger, spaceId);
    const response = await findSLOGroups.execute(params?.query ?? {});
    return response;
  },
});

const deleteSloInstancesRoute = createSloServerRoute({
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

const findSloDefinitionsRoute = createSloServerRoute({
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

const fetchHistoricalSummary = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_historical_summary',
  options: {
    tags: ['access:slo_read'],
  },
  params: fetchHistoricalSummaryParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const historicalSummaryClient = new DefaultHistoricalSummaryClient(esClient);
    const fetchSummaryData = new FetchHistoricalSummary(historicalSummaryClient);

    return await fetchSummaryData.execute(params.body);
  },
});

const getSLOInstancesRoute = createSloServerRoute({
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

const getDiagnosisRoute = createSloServerRoute({
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

const getSloBurnRates = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/{id}/_burn_rates',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: getSLOBurnRatesParamsSchema,
  handler: async ({ request, context, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService.getActiveSpace(request))?.id ?? 'default';

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const { instanceId, windows, remoteName } = params.body;
    const burnRates = await getBurnRates({
      instanceId,
      spaceId,
      windows,
      remoteName,
      sloId: params.path.id,
      services: {
        soClient,
        esClient,
        logger,
      },
    });
    return { burnRates };
  },
});

const getPreviewData = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_preview',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: getPreviewDataParamsSchema,
  handler: async ({ request, context, params, dependencies }) => {
    await assertPlatinumLicense(context);

    const spaceId =
      (await dependencies.spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const service = new GetPreviewData(esClient, spaceId);
    return await service.execute(params.body);
  },
});

const getSloSettingsRoute = createSloServerRoute({
  endpoint: 'GET /internal/slo/settings',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  handler: async ({ context }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    return await getSloSettings(soClient);
  },
});

const putSloSettings = createSloServerRoute({
  endpoint: 'PUT /internal/slo/settings',
  options: {
    tags: ['access:slo_write'],
    access: 'internal',
  },
  params: putSLOSettingsParamsSchema,
  handler: async ({ context, params }) => {
    await assertPlatinumLicense(context);

    const soClient = (await context.core).savedObjects.client;
    return await storeSloSettings(soClient, params.body);
  },
});

export const sloRouteRepository = {
  ...getSloSettingsRoute,
  ...putSloSettings,
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
  ...findSLOGroupsRoute,
};
