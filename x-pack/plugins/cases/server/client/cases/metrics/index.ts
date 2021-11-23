/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsResponse, MetricsResponseRt } from '../../../../common';
import { Operations } from '../../../authorization';
import { createCaseError } from '../../../common';
import { CasesClient } from '../../client';
import { CasesClientArgs } from '../../types';
import { AlertsCount } from './alerts_count';
import { AlertDetails } from './alert_details';
import { Connectors } from './connectors';
import { Lifespan } from './lifespan';
import { MetricsHandler } from './types';

export interface MetricsParams {
  /**
   * The ID of the case.
   */
  caseId: string;
  /**
   * The metrics to retrieve.
   */
  features: string[];
}

export const getMetrics = async (
  params: MetricsParams,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<MetricsResponse> => {
  const handlers = buildHandlers(params, casesClient, clientArgs);
  checkAndThrowIfInvalidFeatures(params, handlers, clientArgs);
  await checkAuthorization(params, clientArgs);

  let metricsResult = {};

  for (const feature of params.features) {
    const handler = handlers.get(feature);
    if (handler) {
      metricsResult = await handler.applyMetrics(metricsResult);
    }
  }

  return MetricsResponseRt.encode(metricsResult);
};

const buildHandlers = (
  params: MetricsParams,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Map<string, MetricsHandler> => {
  const handlers = [
    new Lifespan(params.caseId, casesClient),
    new AlertsCount(),
    new AlertDetails(),
    new Connectors(),
  ];

  const handlersByFeature = new Map<string, MetricsHandler>();
  for (const handler of handlers) {
    // assign each feature to the handler that owns that feature
    handler.getFeatures().forEach((value) => handlersByFeature.set(value, handler));
  }

  return handlersByFeature;
};

const checkAndThrowIfInvalidFeatures = (
  params: MetricsParams,
  handlers: Map<string, MetricsHandler>,
  clientArgs: CasesClientArgs
) => {
  const invalidFeatures = params.features.filter((feature) => !handlers.has(feature));
  if (invalidFeatures.length > 0) {
    const invalidFeaturesAsString = invalidFeatures.join(', ');
    const validFeaturesAsString = [...handlers.keys()].join(', ');

    throw createCaseError({
      logger: clientArgs.logger,
      message: `invalid features: [${invalidFeaturesAsString}], please only provide valid features: [${validFeaturesAsString}]`,
    });
  }
};

const checkAuthorization = async (params: MetricsParams, clientArgs: CasesClientArgs) => {
  const { caseService, unsecuredSavedObjectsClient, authorization } = clientArgs;

  const caseInfo = await caseService.getCase({
    unsecuredSavedObjectsClient,
    id: params.caseId,
  });

  await authorization.ensureAuthorized({
    operation: Operations.getCaseMetrics,
    entities: [{ owner: caseInfo.attributes.owner, id: caseInfo.id }],
  });
};
