/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIFilters } from '../../../typings/ui-filters';
import { getEnvironmentUiFilterES } from './get_environment_ui_filter_es';
import { getKueryUiFilterES } from './get_kuery_ui_filter_es';

export async function getUiFiltersES(uiFilters: UIFilters): Promise<string> {
  const kuery = await getKueryUiFilterES(uiFilters.kuery);
  const environment = getEnvironmentUiFilterES(uiFilters.environment);

  const filters = [kuery, environment].filter(filter => !!filter);

  return encodeURIComponent(JSON.stringify(filters));
}
