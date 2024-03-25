/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultApmServiceEnvironment } from '@kbn/observability-plugin/common';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { Environment } from '../../common/environment_rt';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useDefaultEnvironment() {
  const { core } = useApmPluginContext();

  const defaultServiceEnvironment =
    core.uiSettings.get<Environment>(defaultApmServiceEnvironment) ||
    ENVIRONMENT_ALL.value;

  return defaultServiceEnvironment;
}
