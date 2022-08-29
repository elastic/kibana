/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get, set, cloneDeep } from 'lodash';

import { getHostRiskIndex } from '../../../../../../common/search_strategy/security_solution/risk_score/common';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type { CreateRiskEnrichment, GetIsRiskScoreAvailable } from '../types';

export const getIsHostRiskScoreAvailable: GetIsRiskScoreAvailable = async ({
  spaceId,
  services,
}) => {
  const isHostRiskScoreIndexExist = await services.scopedClusterClient.asCurrentUser.indices.exists(
    {
      index: getHostRiskIndex(spaceId),
    }
  );

  return isHostRiskScoreIndexExist;
};

export const createHostRiskEnrichments: CreateRiskEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'Host Risk',
    index: [getHostRiskIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'host.name',
      enrichmentField: 'host.name',
    },
    createEnrichmentFunction: (enrichment) => (event) => {
      const risk = get(enrichment, `_source.risk`);
      if (!risk) {
        return event;
      }
      const newEvent = cloneDeep(event);
      set(newEvent, '_source.host.risk.calculated_level', risk);
      return newEvent;
    },
  });
};
