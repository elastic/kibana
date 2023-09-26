/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createHostRiskEnrichments,
  getIsHostRiskScoreAvailable,
} from './enrichment_by_type/host_risk';

import {
  createUserRiskEnrichments,
  getIsUserRiskScoreAvailable,
} from './enrichment_by_type/user_risk';
import type {
  EnrichEventsFunction,
  EventsMapByEnrichments,
  CreateEnrichEventsFunction,
} from './types';
import { applyEnrichmentsToEvents } from './utils/transforms';

export const enrichEvents: EnrichEventsFunction = async ({
  services,
  logger,
  events,
  spaceId,
  experimentalFeatures,
}) => {
  try {
    const enrichments = [];

    logger.debug('Alert enrichments started');
    const isNewRiskScoreModuleAvailable = experimentalFeatures?.riskScoringRoutesEnabled ?? false;

    const [isHostRiskScoreIndexExist, isUserRiskScoreIndexExist] = await Promise.all([
      getIsHostRiskScoreAvailable({ spaceId, services, isNewRiskScoreModuleAvailable }),
      getIsUserRiskScoreAvailable({ spaceId, services, isNewRiskScoreModuleAvailable }),
    ]);

    if (isHostRiskScoreIndexExist) {
      enrichments.push(
        createHostRiskEnrichments({
          services,
          logger,
          events,
          spaceId,
          isNewRiskScoreModuleAvailable,
        })
      );
    }

    if (isUserRiskScoreIndexExist) {
      enrichments.push(
        createUserRiskEnrichments({
          services,
          logger,
          events,
          spaceId,
          isNewRiskScoreModuleAvailable,
        })
      );
    }

    const allEnrichmentsResults = await Promise.allSettled(enrichments);

    const allFulfilledEnrichmentsResults = allEnrichmentsResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<EventsMapByEnrichments>)?.value);

    return applyEnrichmentsToEvents({
      events,
      enrichmentsList: allFulfilledEnrichmentsResults,
      logger,
    });
  } catch (error) {
    logger.error(`Enrichments failed ${error}`);
    return events;
  }
};

export const createEnrichEventsFunction: CreateEnrichEventsFunction =
  ({ services, logger }) =>
  (events, { spaceId }: { spaceId: string }, experimentalFeatures) =>
    enrichEvents({
      events,
      services,
      logger,
      spaceId,
      experimentalFeatures,
    });
