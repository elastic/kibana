/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__';

import { CurationQueriesLogic } from './curation_queries_logic';

describe('CurationQueriesLogic', () => {
  const { mount } = new LogicMounter(CurationQueriesLogic);

  const MOCK_QUERIES = ['a', 'b', 'c'];

  const DEFAULT_PROPS = { queries: MOCK_QUERIES };
  const DEFAULT_VALUES = {
    queries: MOCK_QUERIES,
    hasEmptyQueries: false,
    hasOnlyOneQuery: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values passed from props', () => {
    mount({}, DEFAULT_PROPS);
    expect(CurationQueriesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    afterEach(() => {
      // Should not mutate the original array
      expect(CurationQueriesLogic.values.queries).not.toBe(MOCK_QUERIES); // Would fail if we did not clone a new array
    });

    describe('addQuery', () => {
      it('appends an empty string to the queries array', () => {
        mount(DEFAULT_VALUES);
        CurationQueriesLogic.actions.addQuery();

        expect(CurationQueriesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasEmptyQueries: true,
          queries: ['a', 'b', 'c', ''],
        });
      });
    });

    describe('deleteQuery', () => {
      it('deletes the query string at the specified array index', () => {
        mount(DEFAULT_VALUES);
        CurationQueriesLogic.actions.deleteQuery(1);

        expect(CurationQueriesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          queries: ['a', 'c'],
        });
      });
    });

    describe('editQuery', () => {
      it('edits the query string at the specified array index', () => {
        mount(DEFAULT_VALUES);
        CurationQueriesLogic.actions.editQuery(2, 'z');

        expect(CurationQueriesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          queries: ['a', 'b', 'z'],
        });
      });
    });
  });

  describe('selectors', () => {
    describe('hasEmptyQueries', () => {
      it('returns true if queries has any empty strings', () => {
        mount({}, { queries: ['', '', ''] });

        expect(CurationQueriesLogic.values.hasEmptyQueries).toEqual(true);
      });
    });

    describe('hasOnlyOneQuery', () => {
      it('returns true if queries only has one item', () => {
        mount({}, { queries: ['test'] });

        expect(CurationQueriesLogic.values.hasOnlyOneQuery).toEqual(true);
      });
    });
  });
});
