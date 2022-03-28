/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DocValueFields } from '../../../../../../common/search_strategy';

export const buildTimelineDetailsQuery = ({
  authFilter,
  docValueFields,
  id,
  indexName,
  runtimeMappings,
}: {
  authFilter?: JsonObject;
  docValueFields: DocValueFields[];
  id: string;
  indexName: string;
  runtimeMappings: MappingRuntimeFields;
}) => {
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
    allow_no_indices: true,
    index: indexName,
    ignore_unavailable: true,
    body: {
      docvalue_fields: docValueFields,
      query,
      fields: [{ field: '*', include_unmapped: true }],
      // Remove and instead pass index_pattern.id once issue resolved: https://github.com/elastic/kibana/issues/111762
      runtime_mappings: runtimeMappings,
      _source: false,
    },
    size: 1,
  };
};
