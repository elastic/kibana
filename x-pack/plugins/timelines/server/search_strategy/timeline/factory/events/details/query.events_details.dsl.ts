/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { DocValueFields } from '../../../../../../common/search_strategy';
import { getAlertConsumersFilter } from '../utils';

export const buildTimelineDetailsQuery = (
  indexName: string,
  id: string,
  docValueFields: DocValueFields[],
  authFilter?: JsonObject,
  alertConsumers?: AlertConsumers[]
) => {
  const basicFilter = {
    terms: {
      _id: [id],
    },
  };
  const query =
    authFilter != null
      ? {
          bool: {
            filter: [basicFilter, authFilter, ...getAlertConsumersFilter(alertConsumers)],
          },
        }
      : {
          terms: {
            _id: [id],
          },
        };

  return {
    allow_no_indices: true,
    index: indexName,
    ignore_unavailable: true,
    body: {
      docvalue_fields: docValueFields,
      query,
      fields: [{ field: '*', include_unmapped: true }],
      _source: true,
    },
    size: 1,
  };
};
