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

import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
// @ts-expect-error untyped local
import { getState, getStore } from '../../state/store';
import { getGlobalFilters, getWorkpadVariablesAsObject } from '../../state/selectors/workpad';
import { CanvasStartDeps } from '../../plugin';
// @ts-expect-error untyped local
import { setFilter } from '../../state/actions/elements';

export class FiltersService {
  constructor() {}

  getFilters() {
    return getGlobalFilters(getState());
  }

  updateFilter(filterId: string, filterExpression: string) {
    const { dispatch } = getStore();
    dispatch(setFilter(filterExpression, filterId, true));
  }

  getFiltersContext() {
    const variables = getWorkpadVariablesAsObject(getState());
    return { variables };
  }
}

export type CanvasFiltersService = FiltersService;

export type CanvasFiltersServiceFactory = KibanaPluginServiceFactory<
  CanvasFiltersService,
  CanvasStartDeps
>;

export const filtersServiceFactory: CanvasFiltersServiceFactory = () => new FiltersService();
