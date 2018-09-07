/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUrlStateEpic } from '../../../utils/url_state';
import { applyWaffleFilterQuery, restoreFromUrl } from './actions';
import { WaffleFilterState } from './reducer';

export const createWaffleFilterEpic = <State>() => createWaffleFilterUrlStateEpic<State>();

interface WaffleFilterUrlState {
  filterQuery?: WaffleFilterState['filterQuery'];
}

const createWaffleFilterUrlStateEpic = <State>() =>
  createUrlStateEpic<WaffleFilterUrlState, State, {}>('waffleFilter', isWaffleFilterUrlState)
    .restoreOnAction(
      restoreFromUrl,
      urlState =>
        urlState && urlState.filterQuery ? [applyWaffleFilterQuery(urlState.filterQuery)] : []
    )
    .restoreOnChange(
      ({ filterQuery }) => filterQuery,
      (filterQuery, action) => (filterQuery ? [applyWaffleFilterQuery(filterQuery)] : [])
    )
    .persistOnAction(applyWaffleFilterQuery, (urlState, state, { payload }) => ({
      ...urlState,
      filterQuery: payload,
    }));

const isWaffleFilterUrlState = (value: any): value is WaffleFilterUrlState =>
  value &&
  value.filterQuery &&
  value.filterQuery.kind === 'kuery' &&
  typeof value.filterQuery.expression === 'string';
