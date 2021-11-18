/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error untyped local
import { getState, getStore } from '../../../state/store';
import { getGlobalFilters, getWorkpadVariablesAsObject } from '../../../state/selectors/workpad';
// @ts-expect-error untyped local
import { setFilter } from '../../../state/actions/elements';

export class FiltersService {
  constructor() {}

  getFilters() {
    return getGlobalFilters(getState());
  }

  setFilter(filterId: string, filterExpression: string) {
    const { dispatch } = getStore();
    dispatch(setFilter(filterExpression, filterId, true));
  }

  getFiltersContext() {
    const variables = getWorkpadVariablesAsObject(getState());
    return { variables };
  }
}
