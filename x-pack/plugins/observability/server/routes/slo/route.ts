/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateSLO,
  DeleteSLO,
  DefaultResourceInstaller,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
} from '../../services/slo';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  TransformGenerator,
} from '../../services/slo/transform_generators';
import { SLITypes } from '../../types/models';
import { createSLOParamsSchema, deleteSLOParamsSchema } from '../../types/schema';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const transformGenerators: Record<SLITypes, TransformGenerator> = {
  'slo.apm.transaction_duration': new ApmTransactionDurationTransformGenerator(),
  'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
};

const createSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos',
  options: {
    tags: [],
  },
  params: createSLOParamsSchema,
  handler: async ({ context, request, params, logger, spacesService }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const spaceId = spacesService.getSpaceId(request);

    const resourceInstaller = new DefaultResourceInstaller(esClient, logger, spaceId);
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );
    const createSLO = new CreateSLO(resourceInstaller, repository, transformManager);

    const response = await createSLO.execute(params.body);

    return response;
  },
});

const deleteSLORoute = createObservabilityServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id}',
  options: {
    tags: [],
  },
  params: deleteSLOParamsSchema,
  handler: async ({ context, request, params, logger, spacesService }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const spaceId = spacesService.getSpaceId(request);

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(
      transformGenerators,
      esClient,
      logger,
      spaceId
    );

    const deleteSLO = new DeleteSLO(repository, transformManager, esClient);

    await deleteSLO.execute(params.path.id);
  },
});

export const slosRouteRepository = { ...createSLORoute, ...deleteSLORoute };
