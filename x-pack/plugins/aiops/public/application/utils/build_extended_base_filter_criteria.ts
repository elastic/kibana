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
import { type SignificantTerm, SIGNIFICANT_TERM_TYPE } from '@kbn/ml-agg-utils';

import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';

import { getCategoryQuery } from '../../../common/api/log_categorization/get_category_query';

import type { GroupTableItem } from '../../components/log_rate_analysis_results_table/types';

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
  selectedSignificantTerm?: SignificantTerm,
  includeSelectedSignificantTerm = true,
  selectedGroup?: GroupTableItem | null
): estypes.QueryDslQueryContainer[] {
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const groupFilter = [];
  if (selectedGroup) {
    const allItems = selectedGroup.groupItemsSortedByUniqueness;
    for (const item of allItems) {
      const { fieldName, fieldValue, key, type, docCount } = item;
      if (type === SIGNIFICANT_TERM_TYPE.KEYWORD) {
        groupFilter.push({ term: { [fieldName]: fieldValue } });
      } else {
        groupFilter.push(
          getCategoryQuery(fieldName, [
            {
              key,
              count: docCount,
              examples: [],
            },
          ])
        );
      }
    }
  }

  if (includeSelectedSignificantTerm) {
    if (selectedSignificantTerm) {
      if (selectedSignificantTerm.type === 'keyword') {
        filterCriteria.push({
          term: { [selectedSignificantTerm.fieldName]: selectedSignificantTerm.fieldValue },
        });
      } else {
        filterCriteria.push(
          getCategoryQuery(selectedSignificantTerm.fieldName, [
            {
              key: `${selectedSignificantTerm.key}`,
              count: selectedSignificantTerm.doc_count,
              examples: [],
            },
          ])
        );
      }
    } else if (selectedGroup) {
      filterCriteria.push(...groupFilter);
    }
  } else if (selectedSignificantTerm && !includeSelectedSignificantTerm) {
    if (selectedSignificantTerm.type === 'keyword') {
      filterCriteria.push({
        bool: {
          must_not: [
            {
              term: { [selectedSignificantTerm.fieldName]: selectedSignificantTerm.fieldValue },
            },
          ],
        },
      });
    } else {
      filterCriteria.push({
        bool: {
          must_not: [
            getCategoryQuery(selectedSignificantTerm.fieldName, [
              {
                key: `${selectedSignificantTerm.key}`,
                count: selectedSignificantTerm.doc_count,
                examples: [],
              },
            ]),
          ],
        },
      });
    }
  } else if (selectedGroup && !includeSelectedSignificantTerm) {
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
