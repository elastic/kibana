/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CasesMetricsRequest, SingleCaseMetricsRequest } from '../../../common/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { AlertsCount } from './alerts/count';
import { AlertDetails } from './alerts/details';
import { Actions } from './actions';
import { Connectors } from './connectors';
import { Lifespan } from './lifespan';
import type { MetricsHandler } from './types';
import { MTTR } from './all_cases/mttr';

const isSingleCaseMetrics = (
  params: SingleCaseMetricsRequest | CasesMetricsRequest
): params is SingleCaseMetricsRequest => (params as SingleCaseMetricsRequest).caseId != null;

export const buildHandlers = (
  params: SingleCaseMetricsRequest | CasesMetricsRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Set<MetricsHandler<unknown>> => {
  let handlers: Array<MetricsHandler<unknown>> = [];

  if (isSingleCaseMetrics(params)) {
    handlers = [AlertsCount, AlertDetails, Actions, Connectors, Lifespan].map(
      (ClassName) => new ClassName({ caseId: params.caseId, casesClient, clientArgs })
    );
  } else {
    handlers = [MTTR].map(
      (ClassName) =>
        new ClassName({
          owner: params.owner,
          from: params.from,
          to: params.to,
          casesClient,
          clientArgs,
        })
    );
  }

  const uniqueFeatures = new Set(params.features);
  const handlerFeatures = new Set<string>();
  const handlersToExecute = new Set<MetricsHandler<unknown>>();

  for (const handler of handlers) {
    for (const handlerFeature of handler.getFeatures()) {
      if (uniqueFeatures.has(handlerFeature)) {
        handler.setupFeature?.(handlerFeature);
        handlersToExecute.add(handler);
      }

      handlerFeatures.add(handlerFeature);
    }
  }

  checkAndThrowIfInvalidFeatures(params, handlerFeatures);

  return handlersToExecute;
};

const checkAndThrowIfInvalidFeatures = (
  params: SingleCaseMetricsRequest | CasesMetricsRequest,
  handlerFeatures: Set<string>
) => {
  const invalidFeatures = params.features.filter((feature) => !handlerFeatures.has(feature));
  if (invalidFeatures.length > 0) {
    const invalidFeaturesAsString = invalidFeatures.join(', ');
    const validFeaturesAsString = [...handlerFeatures.keys()].sort().join(', ');

    throw Boom.badRequest(
      `invalid features: [${invalidFeaturesAsString}], please only provide valid features: [${validFeaturesAsString}]`
    );
  }
};
