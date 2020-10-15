/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { usePluginContext } from './use_plugin_context';
import { UI_SETTINGS } from '../../../../../src/plugins/data/public';

export { UI_SETTINGS };

type SettingKeys = keyof typeof UI_SETTINGS;
type SettingValues = typeof UI_SETTINGS[SettingKeys];

export function useKibanaUISettings<T>(key: SettingValues): T {
  const { core } = usePluginContext();
  return core.uiSettings.get<T>(key);
}
