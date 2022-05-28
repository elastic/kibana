/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersModel, UsersType, UsersTableType, UsersQueries } from './model';
import { DEFAULT_TABLE_ACTIVE_PAGE } from '../../common/store/constants';

export const setUsersPageQueriesActivePageToZero = (state: UsersModel): UsersQueries => ({
  ...state.page.queries,
  [UsersTableType.allUsers]: {
    ...state.page.queries[UsersTableType.allUsers],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setUsersQueriesActivePageToZero = (
  state: UsersModel,
  type: UsersType
): UsersQueries => {
  if (type === UsersType.page) {
    return setUsersPageQueriesActivePageToZero(state);
  }
  throw new Error(`UsersType ${type} is unknown`);
};
