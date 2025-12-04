/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { APMPluginStartDependencies } from '../../types';

export async function getIsObservabilityAgentEnabled(
  core: CoreSetup<APMPluginStartDependencies>
): Promise<boolean> {
  const [coreStart] = await core.getStartServices();

  // TODO: update to UI setting
  return true;
}
