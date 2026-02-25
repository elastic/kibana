/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { getServiceInventoryHeaderAppActionsConfig } from './header_app_actions_config';

/**
 * Sets the global header overflow app actions config (••• menu with Alerts, SLOs, Settings, Feedback)
 * when the component mounts, and clears it on unmount. Use on APM app pages that share the same
 * overflow menu: Service inventory, Service map, Traces, Dependencies.
 */
export function useApmHeaderAppActions() {
  const { core } = useApmPluginContext();

  useEffect(() => {
    core.chrome.setHeaderAppActionsConfig(getServiceInventoryHeaderAppActionsConfig());
    return () => {
      core.chrome.setHeaderAppActionsConfig(undefined);
    };
  }, [core.chrome]);
}
