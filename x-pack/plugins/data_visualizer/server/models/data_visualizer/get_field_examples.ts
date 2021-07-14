/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { get } from 'lodash';
import { IScopedClusterClient } from 'kibana/server';
import { buildBaseFilterCriteria } from '../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../common/utils/object_utils';
import { FieldExamples } from '../../types/chart_data';

export const getFieldExamples = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  field: string,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  maxExamples: number,
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<FieldExamples> => {
  const { asCurrentUser } = client;

  const index = indexPatternTitle;

  // Request at least 100 docs so that we have a chance of obtaining
  // 'maxExamples' of the field.
  const size = Math.max(100, maxExamples);
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  // Use an exists filter to return examples of the field.
  filterCriteria.push({
    exists: { field },
  });

  const searchBody = {
    fields: [field],
    _source: false,
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });
  const stats = {
    fieldName: field,
    examples: [] as any[],
  };
  // @ts-expect-error incorrect search response type
  if (body.hits.total.value > 0) {
    const hits = body.hits.hits;
    for (let i = 0; i < hits.length; i++) {
      // Use lodash get() to support field names containing dots.
      const doc: object[] | undefined = get(hits[i].fields, field);
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
