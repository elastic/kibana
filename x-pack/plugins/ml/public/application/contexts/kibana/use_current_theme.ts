/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentEuiThemeVars } from '@kbn/ml-kibana-theme';
import { useMlKibana } from './kibana_context';

export function useCurrentThemeVars() {
  const {
    services: { theme },
  } = useMlKibana();
  return useCurrentEuiThemeVars(theme);
}
