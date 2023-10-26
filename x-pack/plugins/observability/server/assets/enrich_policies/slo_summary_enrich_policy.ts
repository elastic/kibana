/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SO_SLO_TYPE } from '../../saved_objects';
import { SLO_SUMMARY_ENRICH_POLICY_NAME } from '../constants';

export const getSLOSummaryEnrichPolicy = () => ({
  name: SLO_SUMMARY_ENRICH_POLICY_NAME,
  match: {
    indices: '.kibana',
    match_field: 'slo.id',
    enrich_fields: [
      'slo.name',
      'slo.description',
      'slo.tags',
      'slo.indicator.type',
      'slo.objective.target',
      'slo.budgetingMethod',
      'slo.timeWindow.type',
      'slo.timeWindow.duration',
      'slo.groupBy',
    ],
    query: {
      bool: {
        filter: [
          {
            match_phrase: {
              type: SO_SLO_TYPE,
            },
          },
        ],
      },
    },
  },
});
