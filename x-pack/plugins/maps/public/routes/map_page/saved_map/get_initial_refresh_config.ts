/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from 'src/plugins/data/public';
import { getUiSettings } from '../../../kibana_services';
import { UI_SETTINGS } from '../../../../../../../src/plugins/data/public';
import { SerializedMapState } from './types';

export function getInitialRefreshConfig({
  serializedMapState,
  globalState = {},
}: {
  serializedMapState?: SerializedMapState;
  globalState: QueryState;
}) {
  const uiSettings = getUiSettings();

  if (serializedMapState?.refreshConfig) {
    return serializedMapState.refreshConfig;
  }

  const defaultRefreshConfig = uiSettings.get(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);
  const refreshInterval = { ...defaultRefreshConfig, ...globalState.refreshInterval };
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
}
