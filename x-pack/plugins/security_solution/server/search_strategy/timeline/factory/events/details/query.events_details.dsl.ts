/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocValueFields } from '../../../../../../common/search_strategy';

export const buildTimelineDetailsQuery = (
  indexName: string,
  id: string,
  docValueFields: DocValueFields[]
) => ({
  allowNoIndices: true,
  index: indexName,
  ignoreUnavailable: true,
  body: {
    docvalue_fields: docValueFields,
    query: {
      terms: {
        _id: [id],
      },
    },
  },
  size: 1,
});
