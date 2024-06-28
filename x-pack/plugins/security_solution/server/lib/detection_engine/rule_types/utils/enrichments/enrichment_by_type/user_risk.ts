/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';
import {
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM,
} from '../../../../../../../common/field_maps/field_names';
import { getUserRiskIndex } from '../../../../../../../common/search_strategy/security_solution/risk_score/common';
import { RiskScoreFields } from '../../../../../../../common/search_strategy/security_solution/risk_score/all';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type { CreateRiskEnrichment } from '../types';
import { getFieldValue } from '../utils/events';

export const createUserRiskEnrichments: CreateRiskEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
  isNewRiskScoreModuleInstalled,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'User Risk',
    index: [getUserRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'user.name',
      enrichmentField: RiskScoreFields.userName,
    },
    enrichmentResponseFields: [
      RiskScoreFields.userName,
      RiskScoreFields.userRisk,
      RiskScoreFields.userRiskScore,
    ],
    createEnrichmentFunction: (enrichment) => (event) => {
      const riskLevel = getFieldValue(enrichment, RiskScoreFields.userRisk);
      const riskScore = getFieldValue(enrichment, RiskScoreFields.userRiskScore);
      if (!riskLevel && !riskScore) {
        return event;
      }
      const newEvent = cloneDeep(event);
      if (riskLevel) {
        set(newEvent, `_source.${ALERT_USER_RISK_SCORE_CALCULATED_LEVEL}`, riskLevel);
      }
      if (riskScore) {
        set(newEvent, `_source.${ALERT_USER_RISK_SCORE_CALCULATED_SCORE_NORM}`, riskScore);
      }
      return newEvent;
    },
  });
};
