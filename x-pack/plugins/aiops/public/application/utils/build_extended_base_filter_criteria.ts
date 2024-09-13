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
import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';

/*
 * Contains utility functions for building and processing queries.
 */

// Builds the base filter criteria used in queries,
// adding criteria for the time range and an optional query.
export function buildExtendedBaseFilterCriteria(
  timeFieldName?: string,
  earliestMs?: number,
  latestMs?: number,
  query?: Query['query'],
  selectedSignificantItem?: SignificantItem,
  includeSelectedSignificantItem = true,
  selectedGroup?: GroupTableItem | null
): estypes.QueryDslQueryContainer[] {
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const groupFilter = [];
  if (selectedGroup) {
    const allItems = selectedGroup.groupItemsSortedByUniqueness;
    for (const item of allItems) {
      const { fieldName, fieldValue, key, type, docCount } = item;
      if (type === SIGNIFICANT_ITEM_TYPE.KEYWORD) {
        groupFilter.push({ term: { [fieldName]: fieldValue } });
      } else {
        groupFilter.push(
          getCategoryQuery(fieldName, [
            {
              key,
              count: docCount,
              examples: [],
              regex: '',
            },
          ])
        );
      }
    }
  }

  if (includeSelectedSignificantItem) {
    if (selectedSignificantItem) {
      if (selectedSignificantItem.type === 'keyword') {
        filterCriteria.push({
          term: { [selectedSignificantItem.fieldName]: selectedSignificantItem.fieldValue },
        });
      } else {
        filterCriteria.push(
          getCategoryQuery(selectedSignificantItem.fieldName, [
            {
              key: `${selectedSignificantItem.key}`,
              count: selectedSignificantItem.doc_count,
              examples: [],
              regex: '',
            },
          ])
        );
      }
    } else if (selectedGroup) {
      filterCriteria.push(...groupFilter);
    }
  } else if (selectedSignificantItem && !includeSelectedSignificantItem) {
    if (selectedSignificantItem.type === 'keyword') {
      filterCriteria.push({
        bool: {
          must_not: [
            {
              term: { [selectedSignificantItem.fieldName]: selectedSignificantItem.fieldValue },
            },
          ],
        },
      });
    } else {
      filterCriteria.push({
        bool: {
          must_not: [
            getCategoryQuery(selectedSignificantItem.fieldName, [
              {
                key: `${selectedSignificantItem.key}`,
                count: selectedSignificantItem.doc_count,
                examples: [],
                regex: '',
              },
            ]),
          ],
        },
      });
    }
  } else if (selectedGroup && !includeSelectedSignificantItem) {
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
