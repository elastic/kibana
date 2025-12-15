/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/onechat-server';
import { AI_AGENTS_FEATURE_FLAG, AI_AGENTS_FEATURE_FLAG_DEFAULT } from '@kbn/ai-assistant-common';
import { hasHistoricalAgentData } from '../../routes/historical_data/has_historical_agent_data';
import type { APMPluginStartDependencies, APMPluginSetupDependencies } from '../../types';
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
    const [coreStart, pluginsStart] = await core.getStartServices();

    const isAiAgentsEnabled = await coreStart.featureFlags.getBooleanValue(
      AI_AGENTS_FEATURE_FLAG,
      AI_AGENTS_FEATURE_FLAG_DEFAULT
    );

    if (!isAiAgentsEnabled) {
      logger.debug(`AI agents are disabled (${AI_AGENTS_FEATURE_FLAG}), skipping registration.`);
      return {
        status: 'unavailable',
        reason: `AI agents are disabled (${AI_AGENTS_FEATURE_FLAG})`,
      };
    }

    // Only register APM Agent Builder tools in Observability or Classic solution spaces
    try {
      const activeSpace = await pluginsStart.spaces?.spacesService.getActiveSpace(request);
      const solution = activeSpace?.solution;
      const isAllowedSolution = !solution || solution === 'classic' || solution === 'oblt';

      if (!isAllowedSolution) {
        logger.debug(
          'Observability agent builder tools are not available in this space, skipping registration.'
        );

        return {
          status: 'unavailable',
          reason: 'Observability tools are not available in this space',
        };
      }
    } catch {
      logger.debug(
        'Spaces are unavailable, proceeding with Observability agent builder tool registration.'
      );
    }

    // Only register APM Agent Builder tools if APM data is available
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
