/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export { UI_SETTINGS };

type SettingKeys = keyof typeof UI_SETTINGS;
type SettingValues = typeof UI_SETTINGS[SettingKeys];

export function useKibanaUISettings<T>(key: SettingValues): T {
  const {
    services: { uiSettings },
  } = useKibana();
  return uiSettings!.get<T>(key);
}
