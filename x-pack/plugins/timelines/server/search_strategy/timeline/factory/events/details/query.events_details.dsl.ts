/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { DocValueFields } from '../../../../../../common/search_strategy';

export const buildTimelineDetailsQuery = (
  indexName: string,
  id: string,
  docValueFields: DocValueFields[],
  authFilter?: JsonObject
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
            filter: [basicFilter, authFilter],
          },
        }
      : {
          terms: {
            _id: [id],
          },
        };

  return {
    allowNoIndices: true,
    index: indexName,
    ignoreUnavailable: true,
    body: {
      docvalue_fields: docValueFields,
      query,
      fields: [{ field: '*', include_unmapped: true }],
      _source: true,
    },
    size: 1,
  };
};
