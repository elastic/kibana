/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apmEnableProfilingIntegration } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { isPending, useFetcher } from './use_fetcher';

export function useProfilingPlugin() {
  const { plugins, core } = useApmPluginContext();
  const isProfilingIntegrationEnabled = core.uiSettings.get<boolean>(
    apmEnableProfilingIntegration,
    true
  );

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/profiling/status');
  }, []);

  const isProfilingAvailable =
    isProfilingIntegrationEnabled && data?.initialized;

  return {
    profilingLocators: isProfilingAvailable
      ? plugins.observabilityShared.locators.profiling
      : undefined,
    isProfilingPluginInitialized: data?.initialized,
    isProfilingIntegrationEnabled,
    isProfilingAvailable,
    isLoading: isPending(status),
  };
}
