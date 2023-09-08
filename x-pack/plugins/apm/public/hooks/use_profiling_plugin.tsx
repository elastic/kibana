/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { apmEnableProfilingIntegration } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useProfilingPlugin() {
  const { plugins, core } = useApmPluginContext();
  const isProfilingIntegrationEnabled = core.uiSettings.get<boolean>(
    apmEnableProfilingIntegration,
    false
  );
  const [isProfilingPluginInitialized, setIsProfilingPluginInitialized] =
    useState<boolean | undefined>();

  useEffect(() => {
    async function fetchIsProfilingSetup() {
      if (!plugins.profiling) {
        setIsProfilingPluginInitialized(false);
        return;
      }
      const resp = await plugins.profiling.hasSetup();
      setIsProfilingPluginInitialized(resp);
    }

    fetchIsProfilingSetup();
  }, [plugins.profiling]);

  return {
    isProfilingPluginInitialized,
    profilingLocators:
      isProfilingIntegrationEnabled && isProfilingPluginInitialized
        ? plugins.profiling?.locators
        : undefined,
    isProfilingIntegrationEnabled,
  };
}
