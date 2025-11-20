/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/onechat-server';
import { OBSERVABILITY_AGENT_FEATURE_FLAG } from '../../../common/observability_agent/feature_flag';
import { hasHistoricalAgentData } from '../../routes/historical_data/has_historical_agent_data';
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

    const { apmEventClient } = await buildApmToolResources({
      core,
      plugins,
      request,
      logger,
    });

    const hasHistoricalData = await hasHistoricalAgentData(apmEventClient);
    logger.debug(`Has historical APM data: ${hasHistoricalData}`);

    return hasHistoricalData
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'No historical APM data' };
  } catch (error) {
    logger.error(`Failed to check observability agent availability: ${error?.message}`);
    logger.debug(error);

    return {
      status: 'unavailable',
      reason: 'Failed observability agent availability check',
    };
  }
}
