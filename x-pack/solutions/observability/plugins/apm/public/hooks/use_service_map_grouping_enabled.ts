/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY } from '../../common/apm_feature_flags';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export const useServiceMapGroupingEnabled = (): boolean => {
  const { core } = useApmPluginContext();
  return core.featureFlags.useBooleanValue(
    APM_SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY,
    false
  );
};
