/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeZone } from '../components/shared/charts/helper/timezone';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useTimeZone() {
  const { core } = useApmPluginContext();
  const timeZone = getTimeZone(core.uiSettings);

  return timeZone;
}
