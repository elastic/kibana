/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with duplicate query utils in
// `x-pack/plugins/data_visualizer/common/utils/query_utils.ts`

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { Query } from '@kbn/es-query';
import type { ChangePoint, FieldValuePair } from '@kbn/ml-agg-utils';
import type { GroupTableItem } from '../../components/spike_analysis_table/types';

/*
 * Contains utility functions for building and processing queries.
 */

// Builds the base filter criteria used in queries,
// adding criteria for the time range and an optional query.
export function buildBaseFilterCriteria(
  timeFieldName?: string,
  earliestMs?: number,
  latestMs?: number,
  query?: Query['query'],
  selectedChangePoint?: ChangePoint,
  includeSelectedChangePoint = true,
  selectedGroup?: GroupTableItem | null
): estypes.QueryDslQueryContainer[] {
  const filterCriteria = [];
  if (timeFieldName && earliestMs && latestMs) {
    filterCriteria.push({
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis',
        },
      },
    });
  }

  if (query && typeof query === 'object') {
    filterCriteria.push(query);
  }

  const groupFilter = [];
  if (selectedGroup) {
    const allItems: FieldValuePair[] = [...selectedGroup.group, ...selectedGroup.repeatedValues];
    for (const item of allItems) {
      const { fieldName, fieldValue } = item;
      groupFilter.push({ term: { [fieldName]: fieldValue } });
    }
  }

  if (includeSelectedChangePoint) {
    if (selectedChangePoint) {
      filterCriteria.push({
        term: { [selectedChangePoint.fieldName]: selectedChangePoint.fieldValue },
      });
    } else if (selectedGroup) {
      filterCriteria.push(...groupFilter);
    }
  } else if (selectedChangePoint && !includeSelectedChangePoint) {
    filterCriteria.push({
      bool: {
        must_not: [
          {
            term: { [selectedChangePoint.fieldName]: selectedChangePoint.fieldValue },
          },
        ],
      },
    });
  } else if (selectedGroup && !includeSelectedChangePoint) {
    filterCriteria.push({
      bool: {
        must_not: [
          {
            bool: {
              filter: [...groupFilter],
            },
          },
        ],
      },
    });
  }

  return filterCriteria;
}
