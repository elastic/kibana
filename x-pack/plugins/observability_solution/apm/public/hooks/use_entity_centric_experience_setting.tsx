/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityCentricExperience } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useEntityCentricExperienceSetting() {
  const { core } = useApmPluginContext();

  const isEntityCentricExperienceEnabled = core.uiSettings.get<boolean>(
    entityCentricExperience,
    true
  );

  return { isEntityCentricExperienceEnabled };
}
