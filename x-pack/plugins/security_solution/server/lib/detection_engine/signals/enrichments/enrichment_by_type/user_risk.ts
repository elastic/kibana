/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get, set, cloneDeep } from 'lodash';
import { getUserRiskIndex } from '../../../../../../common/search_strategy/security_solution/risk_score/common';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type { CreateRiskEnrichment, GetIsRiskScoreAvailable } from '../types';

export const getIsUserRiskScoreAvailable: GetIsRiskScoreAvailable = async ({
  services,
  spaceId,
}) => {
  const isUserRiskScoreIndexExist = await services.scopedClusterClient.asCurrentUser.indices.exists(
    {
      index: getUserRiskIndex(spaceId),
    }
  );

  return isUserRiskScoreIndexExist;
};

export const createUserRiskEnrichments: CreateRiskEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  throw new Error('user risk score');
  return createSingleFieldMatchEnrichment({
    index: [getUserRiskIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'user.name',
      enrichmentField: 'user.name',
    },
    createEnrichmentFunction: (enrichment) => (event) => {
      const risk = get(enrichment, `_source.risk`);
      if (!risk) {
        return event;
      }
      const newEvent = cloneDeep(event);
      set(newEvent, '_source.user.risk.calculated_level', risk);
      return newEvent;
    },
  });
};
