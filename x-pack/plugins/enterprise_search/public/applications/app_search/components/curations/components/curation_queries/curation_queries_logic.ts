/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface CurationQueriesValues {
  queries: string[];
  hasEmptyQueries: boolean;
  hasOnlyOneQuery: boolean;
}

interface CurationQueriesActions {
  addQuery(): void;
  deleteQuery(indexToDelete: number): { indexToDelete: number };
  editQuery(index: number, newQueryValue: string): { index: number; newQueryValue: string };
}

export const CurationQueriesLogic = kea<
  MakeLogicType<CurationQueriesValues, CurationQueriesActions>
>({
  path: ['enterprise_search', 'app_search', 'curation_queries_logic'],
  actions: () => ({
    addQuery: true,
    deleteQuery: (indexToDelete) => ({ indexToDelete }),
    editQuery: (index, newQueryValue) => ({ index, newQueryValue }),
  }),
  reducers: ({ props }) => ({
    queries: [
      props.queries,
      {
        addQuery: (state) => [...state, ''],
        deleteQuery: (state, { indexToDelete }) => {
          const newState = [...state];
          newState.splice(indexToDelete, 1);
          return newState;
        },
        editQuery: (state, { index, newQueryValue }) => {
          const newState = [...state];
          newState[index] = newQueryValue;
          return newState;
        },
      },
    ],
  }),
  selectors: {
    hasEmptyQueries: [(selectors) => [selectors.queries], (queries) => queries.indexOf('') >= 0],
    hasOnlyOneQuery: [(selectors) => [selectors.queries], (queries) => queries.length <= 1],
  },
});
