/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';

import { getHostRiskIndex } from '../../../../../../../common/search_strategy/security_solution/risk_score/common';
import { RiskScoreFields } from '../../../../../../../common/search_strategy/security_solution/risk_score/all';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type { CreateRiskEnrichment, GetIsRiskScoreAvailable } from '../types';
import { getFieldValue } from '../utils/events';

export const getIsHostRiskScoreAvailable: GetIsRiskScoreAvailable = async ({
  spaceId,
  services,
  isNewRiskScoreModuleAvailable,
}) => {
  const isHostRiskScoreIndexExist = await services.scopedClusterClient.asCurrentUser.indices.exists(
    {
      index: getHostRiskIndex(spaceId, true, isNewRiskScoreModuleAvailable),
    }
  );

  return isHostRiskScoreIndexExist;
};

export const createHostRiskEnrichments: CreateRiskEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
  isNewRiskScoreModuleAvailable,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'Host Risk',
    index: [getHostRiskIndex(spaceId, true, isNewRiskScoreModuleAvailable)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'host.name',
      enrichmentField: RiskScoreFields.hostName,
    },
    enrichmentResponseFields: [
      RiskScoreFields.hostName,
      RiskScoreFields.hostRisk,
      RiskScoreFields.hostRiskScore,
    ],
    createEnrichmentFunction: (enrichment) => (event) => {
      const riskLevel = getFieldValue(enrichment, RiskScoreFields.hostRisk);
      const riskScore = getFieldValue(enrichment, RiskScoreFields.hostRiskScore);
      if (!riskLevel && !riskScore) {
        return event;
      }
      const newEvent = cloneDeep(event);
      if (riskLevel) {
        set(newEvent, '_source.host.risk.calculated_level', riskLevel);
      }
      if (riskScore) {
        set(newEvent, '_source.host.risk.calculated_score_norm', riskScore);
      }
      return newEvent;
    },
  });
};
