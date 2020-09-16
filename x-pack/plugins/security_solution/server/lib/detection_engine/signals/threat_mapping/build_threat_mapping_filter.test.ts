/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ThreatMapping,
  ThreatMappingEntries,
} from '../../../../../common/detection_engine/schemas/types/threat_mapping';

import {
  filterThreatMapping,
  buildThreatMappingFilter,
  splitShouldClauses,
  createInnerAndClauses,
  createAndOrClauses,
  buildEntriesMappingFilter,
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
  describe('buildThreatMappingFilter', () => {
    test('it should throw if given a chunk over 1024 in size', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      expect(() =>
        buildThreatMappingFilter({ threatMapping, threatList, chunkSize: 1025 })
      ).toThrow('chunk sizes cannot exceed 1024 in size');
    });

    test('it should NOT throw if given a chunk under 1024 in size', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      expect(() =>
        buildThreatMappingFilter({ threatMapping, threatList, chunkSize: 1023 })
      ).not.toThrow();
    });

    test('it should create the correct entries when using the default mocks', () => {
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

  describe('filterThreatMapping', () => {
    test('it should not remove any entries when using the default mocks', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();

      const item = filterThreatMapping({ threatMapping, threatListItem });
      const expected = getFilterThreatMapping();
      expect(item).toEqual(expected);
    });

    test('it should only give one filtered element if only 1 element is defined', () => {
      const [firstElement] = getThreatMappingMock(); // get only the first element
      const threatListItem = getThreatListItemMock();

      const item = filterThreatMapping({ threatMapping: [firstElement], threatListItem });
      const [firstElementFilter] = getFilterThreatMapping(); // get only the first element to compare
      expect(item).toEqual([firstElementFilter]);
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

  describe('createInnerAndClauses', () => {
    test('it should return two clauses given a single entry', () => {
      const [{ entries: threatMappingEntries }] = getThreatMappingMock(); // get the first element
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({ threatMappingEntries, threatListItem });
      const {
        bool: {
          should: [
            {
              bool: { filter },
            },
          ],
        },
      } = getThreatMappingFilterShouldMock(); // get the first element
      expect(innerClause).toEqual(filter);
    });

    test('it should return an empty array given an empty array', () => {
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({ threatMappingEntries: [], threatListItem });
      expect(innerClause).toEqual([]);
    });

    test('it should filter out a single unknown value', () => {
      const [{ entries }] = getThreatMappingMock(); // get the first element
      const threatMappingEntries: ThreatMappingEntries = [
        ...entries,
        {
          field: 'host.name', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
      ];
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({ threatMappingEntries, threatListItem });
      const {
        bool: {
          should: [
            {
              bool: { filter },
            },
          ],
        },
      } = getThreatMappingFilterShouldMock(); // get the first element
      expect(innerClause).toEqual(filter);
    });

    test('it should filter out 2 unknown values', () => {
      const [{ entries }] = getThreatMappingMock(); // get the first element
      const threatMappingEntries: ThreatMappingEntries = [
        ...entries,
        {
          field: 'host.name', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
        {
          field: 'host.ip', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
      ];
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({ threatMappingEntries, threatListItem });
      const {
        bool: {
          should: [
            {
              bool: { filter },
            },
          ],
        },
      } = getThreatMappingFilterShouldMock(); // get the first element
      expect(innerClause).toEqual(filter);
    });

    test('it should filter out all unknown values as an empty array', () => {
      const threatMappingEntries: ThreatMappingEntries = [
        {
          field: 'host.name', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
        {
          field: 'host.ip', // add second invalid entry which should be filtered away
          value: 'invalid',
          type: 'mapping',
        },
      ];
      const threatListItem = getThreatListItemMock();
      const innerClause = createInnerAndClauses({ threatMappingEntries, threatListItem });
      expect(innerClause).toEqual([]);
    });
  });

  describe('createAndOrClauses', () => {
    test('it should return all clauses given the entries', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = getThreatListItemMock();
      const innerClause = createAndOrClauses({ threatMapping, threatListItem });
      expect(innerClause).toEqual(getThreatMappingFilterShouldMock());
    });

    test('it should filter out data from entries that do not have mappings', () => {
      const threatMapping = getThreatMappingMock();
      const threatListItem = { ...getThreatListItemMock(), foo: 'bar' };
      const innerClause = createAndOrClauses({ threatMapping, threatListItem });
      expect(innerClause).toEqual(getThreatMappingFilterShouldMock());
    });

    test('it should return an empty boolean given an empty array', () => {
      const threatListItem = getThreatListItemMock();
      const innerClause = createAndOrClauses({ threatMapping: [], threatListItem });
      expect(innerClause).toEqual({ bool: { minimum_should_match: 1, should: [] } });
    });

    test('it should return an empty boolean clause given an empty object for a threat list item', () => {
      const threatMapping = getThreatMappingMock();
      const innerClause = createAndOrClauses({ threatMapping, threatListItem: {} });
      expect(innerClause).toEqual({ bool: { minimum_should_match: 1, should: [] } });
    });
  });

  describe('buildEntriesMappingFilter', () => {
    test('it should return all clauses given the entries', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      const mapping = buildEntriesMappingFilter({
        threatMapping,
        threatList,
        chunkSize: 1024,
      });
      const expected: BooleanFilter = {
        bool: { should: [getThreatMappingFilterShouldMock()], minimum_should_match: 1 },
      };
      expect(mapping).toEqual(expected);
    });

    test('it should return empty "should" given an empty threat list', () => {
      const threatMapping = getThreatMappingMock();
      const threatList = getThreatListSearchResponseMock();
      threatList.hits.hits = [];
      const mapping = buildEntriesMappingFilter({
        threatMapping,
        threatList,
        chunkSize: 1024,
      });
      const expected: BooleanFilter = {
        bool: { should: [], minimum_should_match: 1 },
      };
      expect(mapping).toEqual(expected);
    });

    test('it should return empty "should" given an empty threat mapping', () => {
      const threatList = getThreatListSearchResponseMock();
      const mapping = buildEntriesMappingFilter({
        threatMapping: [],
        threatList,
        chunkSize: 1024,
      });
      const expected: BooleanFilter = {
        bool: { should: [], minimum_should_match: 1 },
      };
      expect(mapping).toEqual(expected);
    });

    test('it should ignore entries that are invalid', () => {
      const entries: ThreatMappingEntries = [
        {
          field: 'host.name',
          type: 'mapping',
          value: 'invalid',
        },
        {
          field: 'host.ip',
          type: 'mapping',
          value: 'invalid',
        },
      ];

      const threatMapping: ThreatMapping = [
        ...getThreatMappingMock(),
        ...[
          {
            entries,
          },
        ],
      ];
      const threatList = getThreatListSearchResponseMock();
      const mapping = buildEntriesMappingFilter({
        threatMapping,
        threatList,
        chunkSize: 1024,
      });
      const expected: BooleanFilter = {
        bool: { should: [getThreatMappingFilterShouldMock()], minimum_should_match: 1 },
      };
      expect(mapping).toEqual(expected);
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
