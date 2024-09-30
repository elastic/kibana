/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NamedAggregation } from '@kbn/grouping';
import { ALERT_INSTANCE_ID, ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

export const getAggregationsByGroupingField = (field: string): NamedAggregation[] => {
  switch (field) {
    case ALERT_RULE_NAME:
      return [
        {
          sourceCountAggregation: {
            cardinality: {
              field: ALERT_INSTANCE_ID,
            },
          },
        },
        {
          ruleTags: {
            terms: {
              field: 'tags',
            },
          },
        },
      ];
      break;
    case ALERT_INSTANCE_ID:
      return [
        {
          rulesCountAggregation: {
            cardinality: {
              field: ALERT_RULE_UUID,
            },
          },
        },
      ];
      break;
    default:
      return [
        {
          rulesCountAggregation: {
            cardinality: {
              field: ALERT_RULE_UUID,
            },
          },
        },
      ];
  }
};
