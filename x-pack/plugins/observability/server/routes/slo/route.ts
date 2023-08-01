/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { failedDependency, forbidden } from '@hapi/boom';
import {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  fetchHistoricalSummaryParamsSchema,
  findSLOParamsSchema,
  getPreviewDataParamsSchema,
  getSLOBurnRatesParamsSchema,
  getSLODiagnosisParamsSchema,
  getSLOParamsSchema,
  manageSLOParamsSchema,
  updateSLOParamsSchema,
} from '@kbn/slo-schema';
import type { IndicatorTypes } from '../../domain/models';
import {
  CreateSLO,
  DefaultSummaryClient,
  DefaultTransformManager,
  DeleteSLO,
  FindSLO,
  GetSLO,
  KibanaSavedObjectsSLORepository,
  UpdateSLO,
} from '../../services/slo';
import { FetchHistoricalSummary } from '../../services/slo/fetch_historical_summary';
import { getBurnRates } from '../../services/slo/get_burn_rates';
import { getGlobalDiagnosis, getSloDiagnosis } from '../../services/slo/get_diagnosis';
import { GetPreviewData } from '../../services/slo/get_preview_data';
import { DefaultHistoricalSummaryClient } from '../../services/slo/historical_summary_client';
import { ManageSLO } from '../../services/slo/manage_slo';
import { DefaultSummarySearchClient } from '../../services/slo/summary_search_client';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  HistogramTransformGenerator,
  KQLCustomTransformGenerator,
  MetricCustomTransformGenerator,
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
};

const isLicenseAtLeastPlatinum = async (context: ObservabilityRequestHandlerContext) => {
  const licensing = await context.licensing;
  return licensing.license.hasAtLeast('platinum');
};

const createSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos 2023-10-31',
  options: {
    tags: ['access:slo_write'],
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const createSLO = new CreateSLO(esClient, repository, transformManager);

    const response = await createSLO.execute(params.body);

    return response;
  },
});

const updateSLORoute = createObservabilityServerRoute({
  endpoint: 'PUT /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_write'],
  },
  params: updateSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
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
  endpoint: 'DELETE /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_write'],
  },
  params: deleteSLOParamsSchema,
  handler: async ({
    request,
    context,
    params,
    logger,
    dependencies: { getRulesClientWithRequest },
  }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const rulesClient = getRulesClientWithRequest(request);

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);

    const deleteSLO = new DeleteSLO(repository, transformManager, esClient, rulesClient);

    await deleteSLO.execute(params.path.id);
  },
});

const getSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos/{id} 2023-10-31',
  options: {
    tags: ['access:slo_read'],
  },
  params: getSLOParamsSchema,
  handler: async ({ context, params }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
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

const enableSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/enable 2023-10-31',
  options: {
    tags: ['access:slo_write'],
  },
  params: manageSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const manageSLO = new ManageSLO(repository, transformManager);

    const response = await manageSLO.enable(params.path.id);

    return response;
  },
});

const disableSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/disable 2023-10-31',
  options: {
    tags: ['access:slo_write'],
  },
  params: manageSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const manageSLO = new ManageSLO(repository, transformManager);

    const response = await manageSLO.disable(params.path.id);

    return response;
  },
});

const findSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos 2023-10-31',
  options: {
    tags: ['access:slo_read'],
  },
  params: findSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const summarySearchClient = new DefaultSummarySearchClient(esClient, logger);
    const findSLO = new FindSLO(repository, summarySearchClient);

    const response = await findSLO.execute(params?.query ?? {});

    return response;
  },
});

const fetchHistoricalSummary = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/_historical_summary',
  options: {
    tags: ['access:slo_read'],
  },
  params: fetchHistoricalSummaryParamsSchema,
  handler: async ({ context, params }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
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

const getDiagnosisRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/slos/_diagnosis',
  options: {
    tags: [],
  },
  params: undefined,
  handler: async ({ context }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const licensing = await context.licensing;

    try {
      const response = await getGlobalDiagnosis(esClient, licensing);
      return response;
    } catch (error) {
      if (error.cause.statusCode === 403) {
        throw forbidden('Insufficient Elasticsearch cluster permissions to access feature.');
      }
      throw failedDependency(error);
    }
  },
});

const getSloDiagnosisRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_diagnosis',
  options: {
    tags: [],
  },
  params: getSLODiagnosisParamsSchema,
  handler: async ({ context, params }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient);

    return getSloDiagnosis(params.path.id, { esClient, repository });
  },
});

const getSloBurnRates = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/{id}/_burn_rates',
  options: {
    tags: ['access:slo_read'],
  },
  params: getSLOBurnRatesParamsSchema,
  handler: async ({ context, params }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const burnRates = await getBurnRates(params.path.id, params.body.windows, {
      soClient,
      esClient,
    });
    return { burnRates };
  },
});

const getPreviewData = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/slos/_preview',
  options: {
    tags: ['access:slo_read'],
  },
  params: getPreviewDataParamsSchema,
  handler: async ({ context, params }) => {
    const hasCorrectLicense = await isLicenseAtLeastPlatinum(context);

    if (!hasCorrectLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const service = new GetPreviewData(esClient);
    return await service.execute(params.body);
  },
});

export const sloRouteRepository = {
  ...createSLORoute,
  ...deleteSLORoute,
  ...disableSLORoute,
  ...enableSLORoute,
  ...fetchHistoricalSummary,
  ...findSLORoute,
  ...getSLORoute,
  ...updateSLORoute,
  ...getDiagnosisRoute,
  ...getSloDiagnosisRoute,
  ...getSloBurnRates,
  ...getPreviewData,
};
