/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  filterThreatMapping,
  buildThreatMappingFilter,
  splitShouldClauses,
} from './build_threat_mapping_filter';
import {
  getThreatMappingMock,
  getThreatListSearchResponseMock,
  getThreatListItemMock,
  getThreatMappingFilterMock,
  getFilterThreatMapping,
  getThreatMappingFiltersShouldMock,
  getThreatMappingFilterShouldMock,
} from './build_threat_mapping_filter.mock';
import { BooleanFilter } from './types';

describe('build_threat_mapping_filter', () => {
  describe('filterEntriesNotInThreatListItem', () => {
    test('it should remove one entry when using the default mocks', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();

      const item = filterThreatMapping({ threatMapping, threatListItem });
      const expected = getFilterThreatMapping();
      expect(item).toEqual(expected);
    });

    test('it should not mutate the original threatMapping', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();

      filterThreatMapping({
        threatMapping,
        threatListItem,
      });
      expect(threatMapping).toEqual(getThreatMappingMock());
    });

    test('it should not mutate the original threatListItem', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();

      filterThreatMapping({
        threatMapping,
        threatListItem,
      });
      expect(threatListItem).toEqual(getThreatListItemMock());
    });
  });

  describe('buildEntriesMappingFilter', () => {
    test('it should create the right entries when using the default mocks', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      const filter = buildThreatMappingFilter({ threatMapping, threatList });
      expect(filter).toEqual(getThreatMappingFilterMock());
    });

    test('it should not mutate the original threatMapping', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      buildThreatMappingFilter({ threatMapping, threatList });
      expect(threatMapping).toEqual(getThreatMappingMock());
    });

    test('it should not mutate the original threatListItem', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      buildThreatMappingFilter({ threatMapping, threatList });
      expect(threatList).toEqual(getThreatListSearchResponseMock());
    });
  });

  describe('splitShouldClauses', () => {
    test('it should NOT split a single should clause as there is nothing to split on with chunkSize 1', () => {
      const should = getThreatMappingFiltersShouldMock();
      const clauses = splitShouldClauses({ should, chunkSize: 1 });
      expect(clauses).toEqual(getThreatMappingFiltersShouldMock());
    });

    test('it should NOT mutate the original should clause passed in', () => {
      const should = getThreatMappingFiltersShouldMock();
      expect(should).toEqual(getThreatMappingFiltersShouldMock());
    });

    test('it should NOT split a single should clause as there is nothing to split on with chunkSize 2', () => {
      const should = getThreatMappingFiltersShouldMock();
      const clauses = splitShouldClauses({ should, chunkSize: 2 });
      expect(clauses).toEqual(getThreatMappingFiltersShouldMock());
    });

    test('it should return an empty array given an empty array', () => {
      const clauses = splitShouldClauses({ should: [], chunkSize: 2 });
      expect(clauses).toEqual([]);
    });

    test('it should split an array of size 2 into a length 2 array with chunks on "chunkSize: 1"', () => {
      const should = getThreatMappingFiltersShouldMock(2);
      const clauses = splitShouldClauses({ should, chunkSize: 1 });
      expect(clauses.length).toEqual(2);
    });

    test('it should not mutate the original when splitting on chunks', () => {
      const should = getThreatMappingFiltersShouldMock(2);
      splitShouldClauses({ should, chunkSize: 1 });
      expect(should).toEqual(getThreatMappingFiltersShouldMock(2));
    });

    test('it should split an array of size 2 into 2 different chunks on "chunkSize: 1"', () => {
      const should = getThreatMappingFiltersShouldMock(2);
      const clauses = splitShouldClauses({ should, chunkSize: 1 });
      const expected: BooleanFilter[] = [
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(1)],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(2)],
            minimum_should_match: 1,
          },
        },
      ];
      expect(clauses).toEqual(expected);
    });

    test('it should split an array of size 4 into 4 groups of 4 chunks on "chunkSize: 1"', () => {
      const should = getThreatMappingFiltersShouldMock(4);
      const clauses = splitShouldClauses({ should, chunkSize: 1 });
      const expected: BooleanFilter[] = [
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(1)],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(2)],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(3)],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(4)],
            minimum_should_match: 1,
          },
        },
      ];
      expect(clauses).toEqual(expected);
    });

    test('it should split an array of size 4 into 2 groups of 2 chunks on "chunkSize: 2"', () => {
      const should = getThreatMappingFiltersShouldMock(4);
      const clauses = splitShouldClauses({ should, chunkSize: 2 });
      const expected: BooleanFilter[] = [
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(1), getThreatMappingFilterShouldMock(2)],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(3), getThreatMappingFilterShouldMock(4)],
            minimum_should_match: 1,
          },
        },
      ];
      expect(clauses).toEqual(expected);
    });

    test('it should NOT split an array of size 4 into any groups on "chunkSize: 5"', () => {
      const should = getThreatMappingFiltersShouldMock(4);
      const clauses = splitShouldClauses({ should, chunkSize: 5 });
      const expected: BooleanFilter[] = [
        getThreatMappingFilterShouldMock(1),
        getThreatMappingFilterShouldMock(2),
        getThreatMappingFilterShouldMock(3),
        getThreatMappingFilterShouldMock(4),
      ];
      expect(clauses).toEqual(expected);
    });

    test('it should split an array of size 4 into 2 groups on "chunkSize: 3"', () => {
      const should = getThreatMappingFiltersShouldMock(4);
      const clauses = splitShouldClauses({ should, chunkSize: 3 });
      const expected: BooleanFilter[] = [
        {
          bool: {
            should: [
              getThreatMappingFilterShouldMock(1),
              getThreatMappingFilterShouldMock(2),
              getThreatMappingFilterShouldMock(3),
            ],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [getThreatMappingFilterShouldMock(4)],
            minimum_should_match: 1,
          },
        },
      ];
      expect(clauses).toEqual(expected);
    });
  });
});
