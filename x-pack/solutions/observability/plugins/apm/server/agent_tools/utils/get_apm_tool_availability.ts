/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { OBSERVABILITY_AGENT_FEATURE_FLAG } from '@kbn/observability-agent-plugin/common/constants';
import type { ToolAvailabilityResult } from '@kbn/onechat-server';
import type { APMPluginStartDependencies, APMPluginSetupDependencies } from '../../types';
import { getIsObservabilityAgentEnabled } from './get_is_obs_agent_enabled';
import { buildApmToolResources } from './build_apm_tool_resources';

export async function getApmToolAvailability({
  core,
  plugins,
  request,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ToolAvailabilityResult> {
  try {
    const isEnabled = await getIsObservabilityAgentEnabled(core);
    if (!isEnabled) {
      return {
        status: 'unavailable',
        reason: `Feature flag "${OBSERVABILITY_AGENT_FEATURE_FLAG}" is disabled`,
      };
    }

    const { hasHistoricalData } = await buildApmToolResources({
      core,
      plugins,
      request,
      logger,
    });

    return hasHistoricalData
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'No historical APM data' };
  } catch (e: any) {
    logger.debug(`Failed to check observability agent availability: ${e?.message}`);
    logger.debug(e);

    return {
      status: 'unavailable',
      reason: 'Failed observability agent availability check',
    };
  }
}
