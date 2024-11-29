/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { failedDependency, forbidden } from '@hapi/boom';
import { KibanaRequest } from '@kbn/core-http-server';
import {
  PutSLOSettingsParams,
  createSLOParamsSchema,
  deleteSLOInstancesParamsSchema,
  deleteSLOParamsSchema,
  fetchHistoricalSummaryParamsSchema,
  fetchSLOHealthParamsSchema,
  findSLOGroupsParamsSchema,
  findSLOParamsSchema,
  findSloDefinitionsParamsSchema,
  getPreviewDataParamsSchema,
  getSLOBurnRatesParamsSchema,
  getSLOInstancesParamsSchema,
  getSLOParamsSchema,
  manageSLOParamsSchema,
  putSLOServerlessSettingsParamsSchema,
  putSLOSettingsParamsSchema,
  resetSLOParamsSchema,
  updateSLOParamsSchema,
} from '@kbn/slo-schema';
import { getOverviewParamsSchema } from '@kbn/slo-schema/src/rest_specs/routes/get_overview';
import { executeWithErrorHandler } from '../../errors';
import {
  CreateSLO,
  DefaultBurnRatesClient,
  DefaultSummaryClient,
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  DeleteSLO,
  DeleteSLOInstances,
  FindSLO,
  FindSLOGroups,
  GetSLO,
  GetSLOHealth,
  KibanaSavedObjectsSLORepository,
  UpdateSLO,
} from '../../services';
import { FindSLODefinitions } from '../../services/find_slo_definitions';
import { getBurnRates } from '../../services/get_burn_rates';
import { getGlobalDiagnosis } from '../../services/get_diagnosis';
import { GetPreviewData } from '../../services/get_preview_data';
import { GetSLOInstances } from '../../services/get_slo_instances';
import { GetSLOSuggestions } from '../../services/get_slo_suggestions';
import { GetSLOsOverview } from '../../services/get_slos_overview';
import { DefaultHistoricalSummaryClient } from '../../services/historical_summary_client';
import { ManageSLO } from '../../services/manage_slo';
import { ResetSLO } from '../../services/reset_slo';
import { SloDefinitionClient } from '../../services/slo_definition_client';
import { getSloSettings, storeSloSettings } from '../../services/slo_settings';
import { DefaultSummarySearchClient } from '../../services/summary_search_client';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../../services/transform_generators';
import { createSloServerRoute } from '../create_slo_server_route';
import { SLORoutesDependencies } from '../types';

const assertPlatinumLicense = async (plugins: SLORoutesDependencies['plugins']) => {
  const licensing = await plugins.licensing.start();
  const hasCorrectLicense = (await licensing.getLicense()).hasAtLeast('platinum');

  if (!hasCorrectLicense) {
    throw forbidden('Platinum license or higher is needed to make use of this feature.');
  }
};

const getSpaceId = async (plugins: SLORoutesDependencies['plugins'], request: KibanaRequest) => {
  const spaces = await plugins.spaces.start();
  return (await spaces?.spacesService?.getActiveSpace(request))?.id ?? 'default';
};

const createSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createSLOParamsSchema,
  handler: async ({ context, response, params, logger, request, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const sloContext = await context.slo;
    const dataViews = await plugins.dataViews.start();
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = core.savedObjects.client;
    const basePath = corePlugins.http.basePath;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const [spaceId, dataViewsService] = await Promise.all([
      getSpaceId(plugins, request),
      dataViews.dataViewsServiceFactory(soClient, esClient),
    ]);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );

    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );
    const createSLO = new CreateSLO(
      esClient,
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );

    return await executeWithErrorHandler(() => createSLO.execute(params.body));
  },
});

const inspectSLORoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_inspect',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const sloContext = await context.slo;
    const dataViews = await plugins.dataViews.start();
    const spaceId = await getSpaceId(plugins, request);
    const basePath = corePlugins.http.basePath;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = core.savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const createSLO = new CreateSLO(
      esClient,
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );

    return await executeWithErrorHandler(() => createSLO.inspect(params.body));
  },
});

const updateSLORoute = createSloServerRoute({
  endpoint: 'PUT /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: updateSLOParamsSchema,
  handler: async ({ context, request, params, logger, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const sloContext = await context.slo;
    const basePath = corePlugins.http.basePath;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = core.savedObjects.client;
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const updateSLO = new UpdateSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      scopedClusterClient,
      logger,
      spaceId,
      basePath
    );

    return await executeWithErrorHandler(() => updateSLO.execute(params.path.id, params.body));
  },
});

const deleteSLORoute = createSloServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteSLOParamsSchema,
  handler: async ({ request, response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const sloContext = await context.slo;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = core.savedObjects.client;

    const alerting = await plugins.alerting.start();
    const rulesClient = await alerting.getRulesClientWithRequest(request);

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );

    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const deleteSLO = new DeleteSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      scopedClusterClient,
      rulesClient
    );

    await executeWithErrorHandler(() => deleteSLO.execute(params.path.id));
    return response.noContent();
  },
});

const getSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOParamsSchema,
  handler: async ({ request, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const burnRatesClient = new DefaultBurnRatesClient(esClient);
    const summaryClient = new DefaultSummaryClient(esClient, burnRatesClient);
    const defintionClient = new SloDefinitionClient(repository, esClient, logger);
    const getSLO = new GetSLO(defintionClient, summaryClient);

    return await executeWithErrorHandler(() =>
      getSLO.execute(params.path.id, spaceId, params.query)
    );
  },
});

const enableSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/enable 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: manageSLOParamsSchema,
  handler: async ({ request, response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();
    const sloContext = await context.slo;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );

    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const manageSLO = new ManageSLO(repository, transformManager, summaryTransformManager);

    await executeWithErrorHandler(() => manageSLO.enable(params.path.id));

    return response.noContent();
  },
});

const disableSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/disable 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: manageSLOParamsSchema,
  handler: async ({ response, request, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const sloContext = await context.slo;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const manageSLO = new ManageSLO(repository, transformManager, summaryTransformManager);

    await executeWithErrorHandler(() => manageSLO.disable(params.path.id));
    return response.noContent();
  },
});

const resetSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/_reset 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: resetSLOParamsSchema,
  handler: async ({ context, request, params, logger, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const sloContext = await context.slo;
    const dataViews = await plugins.dataViews.start();
    const spaceId = await getSpaceId(plugins, request);
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const basePath = corePlugins.http.basePath;

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const resetSLO = new ResetSLO(
      esClient,
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );

    return await executeWithErrorHandler(() => resetSLO.execute(params.path.id));
  },
});

const findSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const summarySearchClient = new DefaultSummarySearchClient(esClient, soClient, logger, spaceId);

    const findSLO = new FindSLO(repository, summarySearchClient);

    return await executeWithErrorHandler(() => findSLO.execute(params?.query ?? {}));
  },
});

const findSLOGroupsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_groups',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOGroupsParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const soClient = (await context.core).savedObjects.client;
    const coreContext = context.core;
    const esClient = (await coreContext).elasticsearch.client.asCurrentUser;
    const findSLOGroups = new FindSLOGroups(esClient, soClient, logger, spaceId);
    return await executeWithErrorHandler(() => findSLOGroups.execute(params?.query ?? {}));
  },
});

const getSLOSuggestionsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/suggestions',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  handler: async ({ context, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;
    const getSLOSuggestions = new GetSLOSuggestions(soClient);
    return await executeWithErrorHandler(() => getSLOSuggestions.execute());
  },
});

const deleteSloInstancesRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_delete_instances 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteSLOInstancesParamsSchema,
  handler: async ({ response, context, params, plugins }) => {
    await assertPlatinumLicense(plugins);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const deleteSloInstances = new DeleteSLOInstances(esClient);

    await executeWithErrorHandler(() => deleteSloInstances.execute(params.body));
    return response.noContent();
  },
});

const findSloDefinitionsRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_definitions 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSloDefinitionsParamsSchema,
  handler: async ({ context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const findSloDefinitions = new FindSLODefinitions(repository);

    return await executeWithErrorHandler(() => findSloDefinitions.execute(params?.query ?? {}));
  },
});

const fetchHistoricalSummary = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_historical_summary',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: fetchHistoricalSummaryParamsSchema,
  handler: async ({ context, params, plugins }) => {
    await assertPlatinumLicense(plugins);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const historicalSummaryClient = new DefaultHistoricalSummaryClient(esClient);

    return await executeWithErrorHandler(() => historicalSummaryClient.fetch(params.body));
  },
});

const getSLOInstancesRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_instances',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOInstancesParamsSchema,
  handler: async ({ context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const getSLOInstances = new GetSLOInstances(repository, esClient);

    return await executeWithErrorHandler(() => getSLOInstances.execute(params.path.id));
  },
});

const getDiagnosisRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_diagnosis',
  options: { access: 'internal' },
  security: {
    authz: {
      enabled: false,
      reason: 'The endpoint is used to diagnose SLOs and does not require any specific privileges.',
    },
  },
  params: undefined,
  handler: async ({ context, plugins }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const licensing = await plugins.licensing.start();

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

const fetchSloHealthRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_health',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: fetchSLOHealthParamsSchema,
  handler: async ({ context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const getSLOHealth = new GetSLOHealth(esClient, scopedClusterClient, repository);

    return await executeWithErrorHandler(() => getSLOHealth.execute(params.body));
  },
});

const getSloBurnRates = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/{id}/_burn_rates',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOBurnRatesParamsSchema,
  handler: async ({ request, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const { instanceId, windows, remoteName } = params.body;

    return await executeWithErrorHandler(() =>
      getBurnRates({
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
      })
    );
  },
});

const getPreviewData = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_preview',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getPreviewDataParamsSchema,
  handler: async ({ request, context, params, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const service = new GetPreviewData(esClient, spaceId, dataViewsService);
    return await service.execute(params.body);
  },
});

const getSloSettingsRoute = createSloServerRoute({
  endpoint: 'GET /internal/slo/settings',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  handler: async ({ context, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;

    return await executeWithErrorHandler(() => getSloSettings(soClient));
  },
});

const putSloSettings = (isServerless?: boolean) =>
  createSloServerRoute({
    endpoint: 'PUT /internal/slo/settings',
    options: { access: 'internal' },
    security: {
      authz: {
        requiredPrivileges: ['slo_write'],
      },
    },
    params: isServerless ? putSLOServerlessSettingsParamsSchema : putSLOSettingsParamsSchema,
    handler: async ({ context, params, plugins }) => {
      await assertPlatinumLicense(plugins);

      const soClient = (await context.core).savedObjects.client;
      return await executeWithErrorHandler(() =>
        storeSloSettings(soClient, params.body as PutSLOSettingsParams)
      );
    },
  });

const getSLOsOverview = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/overview',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getOverviewParamsSchema,
  handler: async ({ context, params, request, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const ruleRegistry = await plugins.ruleRegistry.start();
    const racClient = await ruleRegistry.getRacClientWithRequest(request);

    const spaceId = await getSpaceId(plugins, request);

    const alerting = await plugins.alerting.start();
    const rulesClient = await alerting.getRulesClientWithRequest(request);

    const slosOverview = new GetSLOsOverview(
      soClient,
      esClient,
      spaceId,
      logger,
      rulesClient,
      racClient
    );

    return await executeWithErrorHandler(() => slosOverview.execute(params?.query ?? {}));
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
