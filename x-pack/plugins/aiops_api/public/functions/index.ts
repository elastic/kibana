/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { RegisterRenderFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/public/types';
import type { AiopsApiPluginStartDeps } from '../types';
import { registerLogRateAnalysisRenderFunction } from './get_aiops_log_rate_analysis';

export async function registerFunctions({
  coreStart,
  registerRenderFunction,
  pluginsStart,
}: {
  coreStart: CoreStart;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: AiopsApiPluginStartDeps;
}) {
  registerLogRateAnalysisRenderFunction({ coreStart, pluginsStart, registerRenderFunction });
}
