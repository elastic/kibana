/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUrlStateEpic } from '../../../utils/url_state';
import { applyLogFilterQuery, restoreFromUrl } from './actions';
import { LogFilterState } from './reducer';

export const createLogFilterEpic = <State>() => createLogFilterUrlStateEpic<State>();

interface LogFilterUrlState {
  filterQuery?: LogFilterState['filterQuery'];
}

const createLogFilterUrlStateEpic = <State>() =>
  createUrlStateEpic<LogFilterUrlState, State, {}>('logFilter', isLogFilterUrlState)
    .restoreOnAction(
      restoreFromUrl,
      urlState =>
        urlState && urlState.filterQuery ? [applyLogFilterQuery(urlState.filterQuery)] : []
    )
    .restoreOnChange(
      ({ filterQuery }) => filterQuery,
      (filterQuery, action) => (filterQuery ? [applyLogFilterQuery(filterQuery)] : [])
    )
    .persistOnAction(applyLogFilterQuery, (urlState, state, { payload }) => ({
      ...urlState,
      filterQuery: payload,
    }));

const isLogFilterUrlState = (value: any): value is LogFilterUrlState =>
  value &&
  value.filterQuery &&
  value.filterQuery.kind === 'kuery' &&
  typeof value.filterQuery.expression === 'string';
