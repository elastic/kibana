/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import get from 'lodash/fp/get';
import { Filter } from 'src/plugins/data/common';
import { ThreatMapping } from '../../../../../common/detection_engine/schemas/types/threat_mapping';
import {
  BooleanFilter,
  BuildEntriesMappingFilterOptions,
  BuildThreatMappingFilterOptions,
  CreateAndOrClausesOptions,
  CreateInnerAndClausesOptions,
  FilterThreatMappingOptions,
  SplitShouldClausesOptions,
} from './types';

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
  const query = buildEntriesMappingFilter({
    threatMapping,
    threatList,
    chunkSize: computedChunkSize,
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
 * Filters out any entries which do not include the threat list item.
 */
export const filterThreatMapping = ({
  threatMapping,
  threatListItem,
}: FilterThreatMappingOptions): ThreatMapping =>
  threatMapping
    .map((threatMap) => {
      const entries = threatMap.entries.filter((entry) => get(entry.value, threatListItem) != null);
      return { ...threatMap, entries };
    })
    .filter((threatMap) => threatMap.entries.length !== 0);

export const createInnerAndClauses = ({
  threatMappingEntries,
  threatListItem,
}: CreateInnerAndClausesOptions): BooleanFilter[] => {
  return threatMappingEntries.reduce<BooleanFilter[]>((accum, threatMappingEntry) => {
    const value = get(threatMappingEntry.value, threatListItem);
    if (value != null) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: {
          should: [
            {
              match: {
                [threatMappingEntry.field]: value,
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
}: CreateAndOrClausesOptions): BooleanFilter => {
  const should = threatMapping.reduce<unknown[]>((accum, threatMap) => {
    const innerAndClauses = createInnerAndClauses({
      threatMappingEntries: threatMap.entries,
      threatListItem,
    });
    if (innerAndClauses.length !== 0) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: { filter: innerAndClauses },
      });
    }
    return accum;
  }, []);
  return { bool: { should, minimum_should_match: 1 } };
};

export const buildEntriesMappingFilter = ({
  threatMapping,
  threatList,
  chunkSize,
}: BuildEntriesMappingFilterOptions): BooleanFilter => {
  const combinedShould = threatList.hits.hits.reduce<BooleanFilter[]>(
    (accum, threatListSearchItem) => {
      const filteredEntries = filterThreatMapping({
        threatMapping,
        threatListItem: threatListSearchItem._source,
      });
      const queryWithAndOrClause = createAndOrClauses({
        threatMapping: filteredEntries,
        threatListItem: threatListSearchItem._source,
      });
      if (queryWithAndOrClause.bool.should.length !== 0) {
        // These values can be 10k+ large, so using a push here for performance
        accum.push(queryWithAndOrClause);
      }
      return accum;
    },
    []
  );
  const should = splitShouldClauses({ should: combinedShould, chunkSize });
  return { bool: { should, minimum_should_match: 1 } };
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
      accum[chunkIndex].bool.should.push(item);
      return accum;
    }, []);
  }
};
