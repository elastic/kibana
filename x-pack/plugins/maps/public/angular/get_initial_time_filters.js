/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getUiSettings } from '../kibana_services';

export function getInitialTimeFilters({ mapStateJSON, globalState = {} }) {
  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.timeFilters) {
      return mapState.timeFilters;
    }
  }

  const defaultTime = getUiSettings().get('timepicker:timeDefaults');
  return { ...defaultTime, ...globalState.time };
}
