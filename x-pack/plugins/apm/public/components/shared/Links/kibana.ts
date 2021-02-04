/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from '../../../../../../../src/core/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function getUpgradeAssistantHref(basePath: IBasePath) {
  return basePath.prepend('/app/management/stack/upgrade_assistant');
}

export function useUpgradeAssistantHref() {
  const { core } = useApmPluginContext();

  return getUpgradeAssistantHref(core.http.basePath);
}
