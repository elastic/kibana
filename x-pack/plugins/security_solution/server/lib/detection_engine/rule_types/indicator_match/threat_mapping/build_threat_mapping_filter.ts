/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/fp/get';
import type { Filter } from '@kbn/es-query';
import type {
  ThreatMapping,
  ThreatMappingEntries,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  BooleanFilter,
  BuildEntriesMappingFilterOptions,
  BuildThreatMappingFilterOptions,
  CreateAndOrClausesOptions,
  CreateInnerAndClausesOptions,
  FilterThreatMappingOptions,
  SplitShouldClausesOptions,
  TermQuery,
} from './types';
import { ThreatMatchQueryType } from './types';
import { encodeThreatMatchNamedQuery } from './utils';

export const MAX_CHUNK_SIZE = 1024;

export const buildThreatMappingFilter = ({
  threatMapping,
  threatList,
  chunkSize,
  entryKey = 'value',
  allowedFieldsForTermsQuery,
}: BuildThreatMappingFilterOptions): Filter => {
  const computedChunkSize = chunkSize ?? MAX_CHUNK_SIZE;
  if (computedChunkSize > 1024) {
    throw new TypeError('chunk sizes cannot exceed 1024 in size');
  }
  const query = buildEntriesMappingFilter({
    threatMapping,
    threatList,
    chunkSize: computedChunkSize,
    entryKey,
    allowedFieldsForTermsQuery,
  });
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
  threatListItem,
  entryKey,
}: FilterThreatMappingOptions): ThreatMapping =>
  threatMapping
    .map((threatMap) => {
      const atLeastOneItemMissingInThreatList = threatMap.entries.some((entry) => {
        const itemValue = get(entry[entryKey], threatListItem.fields);
        return itemValue == null || itemValue.length !== 1;
      });
      if (atLeastOneItemMissingInThreatList) {
        return { ...threatMap, entries: [] };
      } else {
        return { ...threatMap, entries: threatMap.entries };
      }
    })
    .filter((threatMap) => threatMap.entries.length !== 0);

export const createInnerAndClauses = ({
  threatMappingEntries,
  threatListItem,
  entryKey,
}: CreateInnerAndClausesOptions): BooleanFilter[] => {
  return threatMappingEntries.reduce<BooleanFilter[]>((accum, threatMappingEntry) => {
    const value = get(threatMappingEntry[entryKey], threatListItem.fields);
    if (value != null && value.length === 1) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: {
          should: [
            {
              match: {
                [threatMappingEntry[entryKey === 'field' ? 'value' : 'field']]: {
                  query: value[0],
                  _name: encodeThreatMatchNamedQuery({
                    id: threatListItem._id,
                    index: threatListItem._index,
                    field: threatMappingEntry.field,
                    value: threatMappingEntry.value,
                    queryType: ThreatMatchQueryType.match,
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
  threatListItem,
  entryKey,
}: CreateAndOrClausesOptions): QueryDslQueryContainer[] => {
  const should = threatMapping.reduce<QueryDslQueryContainer[]>((accum, threatMap) => {
    const innerAndClauses = createInnerAndClauses({
      threatMappingEntries: threatMap.entries,
      threatListItem,
      entryKey,
    });
    if (innerAndClauses.length !== 0) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: { filter: innerAndClauses },
      });
    }
    return accum;
  }, []);
  return should;
};

export const buildEntriesMappingFilter = ({
  threatMapping,
  threatList,
  chunkSize,
  entryKey,
  allowedFieldsForTermsQuery,
}: BuildEntriesMappingFilterOptions): BooleanFilter => {
  const allFieldAllowedForTermQuery = (entries: ThreatMappingEntries) =>
    entries.every(
      (entry) =>
        allowedFieldsForTermsQuery?.source?.[entry.field] &&
        allowedFieldsForTermsQuery?.threat?.[entry.value]
    );
  const combinedShould = threatMapping.reduce<{
    match: QueryDslQueryContainer[];
    term: TermQuery[];
  }>(
    (acc, threatMap) => {
      if (threatMap.entries.length > 1 || !allFieldAllowedForTermQuery(threatMap.entries)) {
        threatList.forEach((threatListSearchItem) => {
          const filteredEntries = filterThreatMapping({
            threatMapping: [threatMap],
            threatListItem: threatListSearchItem,
            entryKey,
          });
          const queryWithAndOrClause = createAndOrClauses({
            threatMapping: filteredEntries,
            threatListItem: threatListSearchItem,
            entryKey,
          });
          if (queryWithAndOrClause.length !== 0) {
            // These values can be 10k+ large, so using a push here for performance
            acc.match.push(...queryWithAndOrClause);
          }
        });
      } else {
        const threatMappingEntry = threatMap.entries[0];
        const threats: string[] = threatList
          .map((threatListItem) => get(threatMappingEntry[entryKey], threatListItem.fields))
          .filter((val) => val)
          .map((val) => val[0]);
        if (threats.length > 0) {
          acc.term.push({
            terms: {
              _name: encodeThreatMatchNamedQuery({
                field: threatMappingEntry.field,
                value: threatMappingEntry.value,
                queryType: ThreatMatchQueryType.term,
              }),
              [threatMappingEntry[entryKey === 'field' ? 'value' : 'field']]: threats,
            },
          });
        }
      }
      return acc;
    },
    { match: [], term: [] }
  );

  const matchShould = splitShouldClauses({
    should:
      combinedShould.match.length > 0
        ? [{ bool: { should: combinedShould.match, minimum_should_match: 1 } }]
        : [],
    chunkSize,
  });
  return { bool: { should: [...matchShould, ...combinedShould.term], minimum_should_match: 1 } };
};

export const splitShouldClauses = ({
  should,
  chunkSize,
}: SplitShouldClausesOptions): BooleanFilter[] => {
  if (should.length <= chunkSize) {
    return should;
  } else {
    return should.reduce<BooleanFilter[]>((accum, item, index) => {
      const chunkIndex = Math.floor(index / chunkSize);
      const currentChunk = accum[chunkIndex];
      if (!currentChunk) {
        // create a new element in the array at the correct spot
        accum[chunkIndex] = { bool: { should: [], minimum_should_match: 1 } };
      }
      // Add to the existing array element. Using mutatious push here since these arrays can get very large such as 10k+ and this is going to be a hot code spot.
      if (Array.isArray(accum[chunkIndex].bool?.should)) {
        (accum[chunkIndex].bool?.should as QueryDslQueryContainer[]).push(item);
      }

      return accum;
    }, []);
  }
};
