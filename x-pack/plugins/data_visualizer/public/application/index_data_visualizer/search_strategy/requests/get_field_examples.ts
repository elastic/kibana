/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { get } from 'lodash';
import { buildBaseFilterCriteria } from '../../../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';
import type { Field, FieldExamples } from '../../types/field_stats';

// @todo
const maxExamples = 10;
export const getFieldExamplesRequest = (params: FieldStatsCommonRequestParams, field: Field) => {
  const { index, timeFieldName, earliestMs, latestMs, query, runtimeFieldMap } = params;

  // Request at least 100 docs so that we have a chance of obtaining
  // 'maxExamples' of the field.
  const size = Math.max(100, maxExamples);
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  // Use an exists filter to return examples of the field.
  filterCriteria.push({
    exists: { field: field.fieldName },
  });

  const searchBody = {
    fields: [field.fieldName],
    _source: false,
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
  };

  return {
    index,
    size,
    body: searchBody,
  };
};

export const fetchFieldExamples = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: Field
): Promise<FieldExamples> => {
  const request: SearchRequest = getFieldExamplesRequest(params, field);
  const { body } = await esClient.search(request);

  const stats = {
    fieldName: field.fieldName,
    examples: [] as any[],
  };
  // @ts-expect-error incorrect search response type
  if (body.hits.total.value > 0) {
    const hits = body.hits.hits;
    for (let i = 0; i < hits.length; i++) {
      // Use lodash get() to support field names containing dots.
      const doc: object[] | undefined = get(hits[i].fields, field.fieldName);
      // the results from fields query is always an array
      if (Array.isArray(doc) && doc.length > 0) {
        const example = doc[0];
        if (example !== undefined && stats.examples.indexOf(example) === -1) {
          stats.examples.push(example);
          if (stats.examples.length === maxExamples) {
            break;
          }
        }
      }
    }
  }

  return stats;
};
