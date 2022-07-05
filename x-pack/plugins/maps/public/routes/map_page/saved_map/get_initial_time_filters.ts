/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { getUiSettings } from '../../../kibana_services';
import { SerializedMapState } from './types';

export function getInitialTimeFilters({
  hasSaveAndReturnConfig,
  serializedMapState,
  globalState,
}: {
  hasSaveAndReturnConfig: boolean;
  serializedMapState?: SerializedMapState;
  globalState: GlobalQueryStateFromUrl;
}) {
  if (!hasSaveAndReturnConfig && serializedMapState?.timeFilters) {
    return serializedMapState.timeFilters;
  }

  const defaultTime = getUiSettings().get('timepicker:timeDefaults');
  return { ...defaultTime, ...globalState.time };
}
