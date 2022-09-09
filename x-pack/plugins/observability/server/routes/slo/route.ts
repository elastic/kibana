/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import {
  KibanaSavedObjectsSLORepository,
  ResourceInstaller,
  TransformInstaller,
} from '../../services/slo';
import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
} from '../../services/slo/transform_generators';
import { SLO } from '../../types/models';
import { createSLOParamsSchema } from '../../types/schema';
import { createObservabilityServerRoute } from '../create_observability_server_route';

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

    const resourceInstaller = new ResourceInstaller(esClient, logger);
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformInstaller = new TransformInstaller(
      {
        'slo.apm.transaction_duration': new ApmTransactionDurationTransformGenerator(),
        'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
      },
      esClient,
      logger
    );

    await resourceInstaller.ensureCommonResourcesInstalled(spaceId);

    const slo: SLO = {
      ...params.body,
      id: uuid.v1(),
      settings: {
        destination_index: params.body.settings?.destination_index,
      },
    };

    await repository.save(slo);
    await transformInstaller.installAndStartTransform(slo, spaceId);

    return slo;
  },
});

export const slosRouteRepository = createSLORoute;
