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
  fetchHistoricalSummaryResponseSchema,
  fetchSLOHealthParamsSchema,
  findSloDefinitionsParamsSchema,
  findSLOGroupsParamsSchema,
  findSLOParamsSchema,
  getPreviewDataParamsSchema,
  getSLOBurnRatesParamsSchema,
  getSLOInstancesParamsSchema,
  getSLOParamsSchema,
  manageSLOParamsSchema,
  putSLOServerlessSettingsParamsSchema,
  PutSLOSettingsParams,
  putSLOSettingsParamsSchema,
  resetSLOParamsSchema,
  updateSLOParamsSchema,
} from '@kbn/slo-schema';
import { getOverviewParamsSchema } from '@kbn/slo-schema/src/rest_specs/routes/get_overview';
import { GetSLOsOverview } from '../../services/get_slos_overview';
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
  GetSLOHealth,
  UpdateSLO,
} from '../../services';
import { FindSLODefinitions } from '../../services/find_slo_definitions';
import { getBurnRates } from '../../services/get_burn_rates';
import { getGlobalDiagnosis } from '../../services/get_diagnosis';
import { GetPreviewData } from '../../services/get_preview_data';
import { GetSLOInstances } from '../../services/get_slo_instances';
import { GetSLOSuggestions } from '../../services/get_slo_suggestions';
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

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );

    const createSLO = new CreateSLO(sloContext, transformManager, summaryTransformManager);

    return await createSLO.execute(params.body);
  },
});

const inspectSLORoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_inspect',
  options: {
    tags: ['access:slo_write'],
    access: 'internal',
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger, dependencies, request }) => {
    await assertPlatinumLicense(context);

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );

    const createSLO = new CreateSLO(
      sloContext,

      transformManager,
      summaryTransformManager
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

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );
    const updateSLO = new UpdateSLO(sloContext, transformManager, summaryTransformManager);

    return await updateSLO.execute(params.path.id, params.body);
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

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );

    const deleteSLO = new DeleteSLO(sloContext, transformManager, summaryTransformManager);

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

    const sloContext = await context.slo;
    const summaryClient = new DefaultSummaryClient(sloContext.esClient, sloContext.burnRatesClient);
    const definitionClient = new SloDefinitionClient(sloContext);
    const getSLO = new GetSLO(definitionClient, summaryClient);

    return await getSLO.execute(params.path.id, sloContext.spaceId, params.query);
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

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );

    const manageSLO = new ManageSLO(
      sloContext.repository,
      transformManager,
      summaryTransformManager
    );
    return await manageSLO.enable(params.path.id);
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

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );

    const manageSLO = new ManageSLO(
      sloContext.repository,
      transformManager,
      summaryTransformManager
    );
    return await manageSLO.disable(params.path.id);
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

    const sloContext = await context.slo;
    const transformManager = new DefaultTransformManager(sloContext, transformGenerators);
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      sloContext
    );
    const resetSLO = new ResetSLO(sloContext, transformManager, summaryTransformManager);

    return await resetSLO.execute(params.path.id);
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

    const sloContext = await context.slo;
    const summarySearchClient = new DefaultSummarySearchClient(sloContext);
    const findSLO = new FindSLO(sloContext.repository, summarySearchClient);

    return await findSLO.execute(params?.query ?? {});
  },
});

const findSLOGroupsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_groups',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: findSLOGroupsParamsSchema,
  handler: async ({ context, request, params, logger, dependencies }) => {
    await assertPlatinumLicense(context);
    const sloContext = await context.slo;
    const findSLOGroups = new FindSLOGroups(sloContext);
    return await findSLOGroups.execute(params?.query ?? {});
  },
});

const getSLOSuggestionsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/suggestions',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  handler: async ({ context }) => {
    await assertPlatinumLicense(context);
    const sloContext = await context.slo;
    const getSLOSuggestions = new GetSLOSuggestions(sloContext.soClient);
    return await getSLOSuggestions.execute();
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
    const sloContext = await context.slo;
    const deleteSloInstances = new DeleteSLOInstances(sloContext.esClient);
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
    const sloContext = await context.slo;
    const findSloDefinitions = new FindSLODefinitions(sloContext.repository);
    return await findSloDefinitions.execute(params?.query ?? {});
  },
});

const fetchHistoricalSummary = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_historical_summary',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: fetchHistoricalSummaryParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);
    const sloContext = await context.slo;
    const historicalSummaryClient = new DefaultHistoricalSummaryClient(sloContext);

    const historicalSummary = await historicalSummaryClient.fetch(params.body);

    return fetchHistoricalSummaryResponseSchema.encode(historicalSummary);
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
    const sloContext = await context.slo;
    const getSLOInstances = new GetSLOInstances(sloContext);
    return await getSLOInstances.execute(params.path.id);
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
    const sloContext = await context.slo;
    const licensing = await context.licensing;

    try {
      return await getGlobalDiagnosis(sloContext.esClient, licensing);
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 403) {
        throw forbidden('Insufficient Elasticsearch cluster permissions to access feature.');
      }
      throw failedDependency(error);
    }
  },
});

const fetchSloHealthRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_health',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: fetchSLOHealthParamsSchema,
  handler: async ({ context, params, logger }) => {
    await assertPlatinumLicense(context);
    const sloContext = await context.slo;
    const getSLOHealth = new GetSLOHealth(sloContext);

    return await getSLOHealth.execute(params.body);
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
    const sloContext = await context.slo;
    const { instanceId, windows, remoteName } = params.body;

    return await getBurnRates({
      instanceId,
      windows,
      remoteName,
      sloId: params.path.id,
      context: sloContext,
    });
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
    const sloContext = await context.slo;
    const service = new GetPreviewData(sloContext);
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
    const { soClient } = await context.slo;
    return await getSloSettings(soClient);
  },
});

const putSloSettings = (isServerless?: boolean) =>
  createSloServerRoute({
    endpoint: 'PUT /internal/slo/settings',
    options: {
      tags: ['access:slo_write'],
      access: 'internal',
    },
    params: isServerless ? putSLOServerlessSettingsParamsSchema : putSLOSettingsParamsSchema,
    handler: async ({ context, params }) => {
      await assertPlatinumLicense(context);
      const { soClient } = await context.slo;
      return await storeSloSettings(soClient, params.body as PutSLOSettingsParams);
    },
  });

const getSLOsOverview = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/overview',
  options: {
    tags: ['access:slo_read'],
    access: 'internal',
  },
  params: getOverviewParamsSchema,
  handler: async ({ context, params, request, logger, dependencies }) => {
    await assertPlatinumLicense(context);
    const sloContext = await context.slo;
    const racClient = await dependencies.getRacClientWithRequest(request);

    const slosOverview = new GetSLOsOverview(sloContext, racClient);
    return await slosOverview.execute(params?.query ?? {});
  },
});

export const getSloRouteRepository = (isServerless?: boolean) => {
  return {
    ...fetchSloHealthRoute,
    ...getSloSettingsRoute,
    ...putSloSettings(isServerless),
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
    ...getSLOSuggestionsRoute,
    ...getSLOsOverview,
  };
};
