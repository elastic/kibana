/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/fp/get';
import type { Filter } from '@kbn/es-query';
import { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  BooleanFilter,
  BoolFilter,
  BuildEntriesMappingFilterOptions,
  BuildThreatMappingFilterOptions,
  CreateAndOrClausesOptions,
  CreateInnerAndClausesOptions,
  FilterThreatMappingOptions,
} from './types';
import { encodeThreatMatchNamedQuery } from './utils';

export const MAX_CHUNK_SIZE = 1024;

export const buildThreatMappingFilter = ({
  threatMapping,
  threatList,
  chunkSize,
}: BuildThreatMappingFilterOptions): Filter => {
  const computedChunkSize = chunkSize ?? MAX_CHUNK_SIZE;
  if (computedChunkSize > 1024) {
    throw new TypeError('chunk sizes cannot exceed 1024 in size');
  }
  // const query = buildEntriesMappingFilter({
  //   threatMapping,
  //   threatList,
  //   chunkSize: computedChunkSize,
  // });
  const query: BooleanFilter = { bool: { should: [], minimum_should_match: 1 } };
  const filterChunk: Filter = {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
    },
    query,
  };
  return filterChunk;
};

/**
 * Filters out any combined "AND" entries which do not include all the threat list items.
 */
export const filterThreatMapping = ({
  threatMapping,
  indicator,
}: FilterThreatMappingOptions): ThreatMapping => {
  const filteredThreatMapping: ThreatMapping = [];
  return threatMapping.reduce((acc, threatMap) => {
    const atLeastOneItemMissingInThreatList = threatMap.entries.some((entry) => {
      const itemValue = get(entry.value, indicator.fields);
      return itemValue == null || itemValue.length !== 1;
    });
    if (!atLeastOneItemMissingInThreatList) {
      acc.push({ ...threatMap, entries: threatMap.entries });
    }
    return acc;
  }, filteredThreatMapping);
};

export const createInnerAndClauses = ({
  threatMappingEntries,
  indicator,
}: CreateInnerAndClausesOptions): BooleanFilter[] => {
  return threatMappingEntries.reduce<BooleanFilter[]>((accum, threatMappingEntry) => {
    const value = get(threatMappingEntry.value, indicator.fields);
    if (value != null && value.length === 1) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: {
          should: [
            {
              match: {
                [threatMappingEntry.field]: {
                  query: value[0],
                  _name: encodeThreatMatchNamedQuery({
                    id: indicator._id,
                    index: indicator._index,
                    field: threatMappingEntry.field,
                    value: threatMappingEntry.value,
                  }),
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }
    return accum;
  }, []);
};

export const createAndOrClauses = ({
  threatMapping,
  indicator,
}: CreateAndOrClausesOptions): BooleanFilter[] => {
  const booleanFilters: BooleanFilter[] = [];
  threatMapping.reduce<unknown[]>((accum, threatMap) => {
    const innerAndClauses = createInnerAndClauses({
      threatMappingEntries: threatMap.entries,
      indicator,
    });
    if (innerAndClauses.length) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: { filter: innerAndClauses },
      });
    }
    return accum;
  }, booleanFilters);
  return booleanFilters;
};

export const createPercolateQueries = ({
  threatMapping,
  threatList,
}: Omit<BuildEntriesMappingFilterOptions, 'chunkSize'>): BooleanFilter[] => {
  const booleanFilters: BooleanFilter[] = [];
  return threatList.reduce((acc, indicator) => {
    acc.push(
      ...createAndOrClauses({
        threatMapping: filterThreatMapping({
          threatMapping,
          indicator,
        }),
        indicator,
      })
    );
    return acc;
  }, booleanFilters);
};

export const createPercolateQueriesNew = ({
  threatMapping,
  threatList,
}: Omit<BuildEntriesMappingFilterOptions, 'chunkSize'>): BoolFilter[] => {
  return threatList.reduce<BoolFilter[]>((queries, indicator) => {
    const query = threatMapping.reduce<BoolFilter[]>((clauses, threatMapItem) => {
      const filters = threatMapItem.entries.reduce<BoolFilter[]>((clauseParts, entry) => {
        const value = get(entry.value, indicator.fields);
        if (value != null && value.length === 1) {
          clauseParts.push({
            bool: {
              should: [
                {
                  match: {
                    [entry.field]: {
                      query: value[0],
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
            _name: encodeThreatMatchNamedQuery({
              id: indicator._id,
              index: indicator._index,
              field: entry.field,
              value: entry.value,
            }),
            indicator,
          });
        }
        return clauseParts;
      }, []);
      if (filters.length === 1) {
        clauses.push({ ...filters[0] });
      } else if (filters.length > 1) {
        clauses.push({
          bool: { filter: filters, minimum_should_match: 1 },
          _name: filters.map((filt) => filt._name).join('-'),
          indicator,
        });
      }
      return clauses;
    }, []);
    queries.push(...query);
    return queries;
  }, []);
};

//
// export const buildEntriesMappingFilter = ({
//   threatMapping,
//   threatList,
//   chunkSize,
// }: BuildEntriesMappingFilterOptions): BooleanFilter => {
//   const combinedShould = threatList.reduce<BooleanFilter[]>((accum, indicator) => {
//     const filteredEntries = filterThreatMapping({
//       threatMapping,
//       indicator,
//     });
//     const queryWithAndOrClause = createAndOrClauses({
//       threatMapping: filteredEntries,
//       indicator,
//     });
//     accum.push(...queryWithAndOrClause);
//     return accum;
//   }, []);
//  return combinedShould;
// };
//
// export const splitShouldClauses = ({
//   should,
//   chunkSize,
// }: SplitShouldClausesOptions): BooleanFilter[] => {
//   if (should.length <= chunkSize) {
//     return should;
//   } else {
//     return should.reduce<BooleanFilter[]>((accum, item, index) => {
//       const chunkIndex = Math.floor(index / chunkSize);
//       const currentChunk = accum[chunkIndex];
//       if (!currentChunk) {
//         // create a new element in the array at the correct spot
//         accum[chunkIndex] = { bool: { should: [], minimum_should_match: 1 } };
//       }
//       // Add to the existing array element. Using mutatious push here since these arrays can get very large such as 10k+ and this is going to be a hot code spot.
//       accum[chunkIndex].bool.should.push(item);
//       return accum;
//     }, []);
//   }
// };
