/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isString from 'lodash/isString';
import get from 'lodash/fp/get';
import type { Filter } from '@kbn/es-query';
import type { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  BooleanFilter,
  BuildEntriesMappingFilterOptions,
  BuildThreatMappingFilterOptions,
  CreateAndOrClausesOptions,
  CreateInnerAndClausesOptions,
  FilterThreatMappingOptions,
  SplitShouldClausesOptions,
} from './types';
import { encodeThreatMatchNamedQuery } from './utils';

export const MAX_CHUNK_SIZE = 1024;

export const buildThreatMappingFilter = ({
  threatMapping,
  threatList,
  chunkSize,
  entryKey = 'value',
}: BuildThreatMappingFilterOptions): Filter => {
  // console.log('currentThreatList', JSON.stringify(threatList, null, 2));
  const computedChunkSize = chunkSize ?? MAX_CHUNK_SIZE;
  if (computedChunkSize > 1024) {
    throw new TypeError('chunk sizes cannot exceed 1024 in size');
  }
  const query = buildEntriesMappingFilter({
    threatMapping,
    threatList,
    chunkSize: computedChunkSize,
    entryKey,
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
      // console.log('threatMap', JSON.stringify(threatMap, null, 2));
      const atLeastOneItemMissingInThreatList = threatMap.entries.some((entry) => {
        // console.log('entry', JSON.stringify(entry, null, 2));
        // console.log('threatListItem', JSON.stringify(threatListItem, null, 2));
        let itemValue = get(entry[entryKey], threatListItem.fields);
        if (entry[entryKey].includes('vuln.affected')) {
          itemValue = get(
            `[0]['${entry[entryKey].split('vuln.affected.')[1]}']`,
            threatListItem.fields?.['vuln.affected']
          );
        }
        // console.log('itemValue', entry[entryKey], JSON.stringify(itemValue, null, 2));
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
  // console.log('threatMappingEntries', JSON.stringify(threatMappingEntries, null, 2));
  return threatMappingEntries.reduce<BooleanFilter[]>((accum, threatMappingEntry) => {
    let value = get(threatMappingEntry[entryKey], threatListItem.fields);

    if (threatMappingEntry[entryKey].includes('vuln.affected')) {
      value = get(
        threatMappingEntry[entryKey].split('vuln.affected.')[1],
        threatListItem.fields['vuln.affected'][0]
      );
    }

    // console.log(
    //   'value',
    //   value,
    //   entryKey,
    //   threatMappingEntry[entryKey],
    //   threatMappingEntry[entryKey].split('vuln.affected.')[1],
    //   threatListItem.fields['vuln.affected'][0],
    //   threatListItem._source.vuln.affected[0],
    //   get(
    //     threatMappingEntry[entryKey].split('vuln.affected.')[1],
    //     threatListItem._source.vuln.affected[0]
    //   )
    // );

    if (value != null && value.length === 1) {
      if (isString(value[0]) || entryKey === 'field') {
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
                    }),
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      } else if (threatMappingEntry[entryKey].includes('vuln.affected.ranges.range')) {
        accum.push({
          bool: {
            should: [
              {
                range: {
                  [threatMappingEntry.field]:
                    threatListItem._source.vuln.affected[0].ranges[0].range,
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      }
    }
    return accum;
  }, []);
};

export const createAndOrClauses = ({
  threatMapping,
  threatListItem,
  entryKey,
}: CreateAndOrClausesOptions): BooleanFilter => {
  const should = threatMapping.reduce<unknown[]>((accum, threatMap) => {
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
  return { bool: { should, minimum_should_match: 1 } };
};

export const buildEntriesMappingFilter = ({
  threatMapping,
  threatList,
  chunkSize,
  entryKey,
}: BuildEntriesMappingFilterOptions): BooleanFilter => {
  // console.log('buuildddd', JSON.stringify(threatMapping, null, 2));
  const combinedShould = threatList.reduce<BooleanFilter[]>((accum, threatListSearchItem) => {
    const filteredEntries = filterThreatMapping({
      threatMapping,
      threatListItem: threatListSearchItem,
      entryKey,
    });
    // console.log('filteredEntries', JSON.stringify(filteredEntries, null, 2));
    const queryWithAndOrClause = createAndOrClauses({
      threatMapping: filteredEntries,
      threatListItem: threatListSearchItem,
      entryKey,
    });
    if (queryWithAndOrClause.bool.should.length !== 0) {
      // These values can be 10k+ large, so using a push here for performance
      accum.push(queryWithAndOrClause);
    }
    return accum;
  }, []);
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
