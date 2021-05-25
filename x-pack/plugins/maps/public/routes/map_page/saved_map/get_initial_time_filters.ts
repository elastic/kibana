/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from 'src/plugins/data/public';
import { getUiSettings } from '../../../kibana_services';

export function getInitialTimeFilters({
  mapStateJSON,
  globalState,
}: {
  mapStateJSON?: string;
  globalState: QueryState;
}) {
  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.timeFilters) {
      return mapState.timeFilters;
    }
  }

  const defaultTime = getUiSettings().get('timepicker:timeDefaults');
  return { ...defaultTime, ...globalState.time };
}
