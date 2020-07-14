/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUiSettings } from '../../kibana_services';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';

export function getInitialRefreshConfig({ mapStateJSON, globalState = {} }) {
  const uiSettings = getUiSettings();

  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.refreshConfig) {
      return mapState.refreshConfig;
    }
  }

  const defaultRefreshConfig = uiSettings.get(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);
  const refreshInterval = { ...defaultRefreshConfig, ...globalState.refreshInterval };
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
}
