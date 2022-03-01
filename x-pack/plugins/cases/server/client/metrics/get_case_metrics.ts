/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import Boom from '@hapi/boom';

import { CaseMetricsResponseRt, CaseMetricsResponse } from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { CasesClient } from '../client';
import { CasesClientArgs } from '../types';
import { AlertsCount } from './alerts/count';
import { AlertDetails } from './alerts/details';
import { Actions } from './actions';
import { Connectors } from './connectors';
import { Lifespan } from './lifespan';
import { MetricsHandler } from './types';

export interface CaseMetricsParams {
  /**
   * The ID of the case.
   */
  caseId: string;
  /**
   * The metrics to retrieve.
   */
  features: string[];
}

export const getCaseMetrics = async (
  params: CaseMetricsParams,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CaseMetricsResponse> => {
  const { logger } = clientArgs;

  try {
    await checkAuthorization(params, clientArgs);
    const handlers = buildHandlers(params, casesClient, clientArgs);

    const computedMetrics = await Promise.all(
      Array.from(handlers).map(async (handler) => {
        return handler.compute();
      })
    );

    const mergedResults = computedMetrics.reduce((acc, metric) => {
      return merge(acc, metric);
    }, {});

    return CaseMetricsResponseRt.encode(mergedResults);
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve metrics within client for case id: ${params.caseId}: ${error}`,
      error,
    });
  }
};

const buildHandlers = (
  params: CaseMetricsParams,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Set<MetricsHandler> => {
  const handlers: MetricsHandler[] = [AlertsCount, AlertDetails, Actions, Connectors, Lifespan].map(
    (ClassName) => new ClassName({ caseId: params.caseId, casesClient, clientArgs })
  );

  const uniqueFeatures = new Set(params.features);
  const handlerFeatures = new Set<string>();
  const handlersToExecute = new Set<MetricsHandler>();
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
  params: CaseMetricsParams,
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

const checkAuthorization = async (params: CaseMetricsParams, clientArgs: CasesClientArgs) => {
  const { caseService, authorization } = clientArgs;

  const caseInfo = await caseService.getCase({
    id: params.caseId,
  });

  await authorization.ensureAuthorized({
    operation: Operations.getCaseMetrics,
    entities: [{ owner: caseInfo.attributes.owner, id: caseInfo.id }],
  });
};
