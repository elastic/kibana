/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';
import { RiskScoreFields } from '../../../../../../../common/search_strategy/security_solution/risk_score/all';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type { CreateCriticalityEnrichment } from '../types';
import { getFieldValue } from '../utils/events';

export const createUserAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  const extraFilter = {
    filter: {
      term: {
        id_field: 'user.name',
      },
    },
  };

  return createSingleFieldMatchEnrichment({
    name: 'User Asset Criticality',
    // TODO, use function for this
    index: ['.asset-criticality.asset-criticality-default'],
    // index: [getUserRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'user.name',
      enrichmentField: RiskScoreFields.userName,
    },
    enrichmentResponseFields: [
      // TODO, use constants
      'id_value', // TODO, confirm if we need this
      'criticality_level',
    ],
    extraFilter,
    createEnrichmentFunction: (enrichment) => (event) => {
      // TODO, use constant
      const criticality = getFieldValue(enrichment, 'criticality_level');

      if (!criticality) {
        return event;
      }
      const newEvent = cloneDeep(event);
      if (criticality) {
        // TODO, this may not work because the field is in `kibana.`.
        set(newEvent, '_source.kibana.alert.user.criticality', criticality);
      }
      return newEvent;
    },
  });
};
