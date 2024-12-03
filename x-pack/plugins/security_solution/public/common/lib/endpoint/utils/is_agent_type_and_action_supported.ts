/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResponseActionAgentType,
  EDRActionsApiCommandNames,
  ResponseActionType,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { isActionSupportedByAgentType } from '../../../../../common/endpoint/service/response_actions/is_response_action_supported';
import { ExperimentalFeaturesService } from '../../../experimental_features_service';

/**
 * Checks if a given Agent type is supported (aka: is feature flag enabled) and optionally
 * also checks if a given response action is implemented for that agent type.
 */
export const isAgentTypeAndActionSupported = (
  agentType: ResponseActionAgentType,
  actionName?: EDRActionsApiCommandNames<typeof agentType>,
  actionType: ResponseActionType = 'manual'
): boolean => {
  const features = ExperimentalFeaturesService.get();
  const isSentinelOneV1Enabled = features.responseActionsSentinelOneV1Enabled;
  const isSentinelOneGetFileEnabled = features.responseActionsSentinelOneGetFileEnabled;
  const isCrowdstrikeHostIsolationEnabled =
    features.responseActionsCrowdstrikeManualHostIsolationEnabled;

  const isAgentTypeSupported =
    agentType === 'endpoint' ||
    (agentType === 'sentinel_one' && isSentinelOneV1Enabled) ||
    (agentType === 'crowdstrike' && isCrowdstrikeHostIsolationEnabled);

  let isActionNameSupported: boolean =
    !actionName || isActionSupportedByAgentType(agentType, actionName, actionType);

  // if response action is supported, then do specific response action FF checks
  if (isAgentTypeSupported && isActionNameSupported && actionName) {
    switch (agentType) {
      case 'sentinel_one':
        switch (actionName) {
          case 'get-file':
            if (!isSentinelOneGetFileEnabled) {
              isActionNameSupported = false;
            }
            break;
        }

        break;

      case 'crowdstrike':
        // Placeholder for future individual response actions FF checks
        break;
    }
  }

  return Boolean(isAgentTypeSupported && isActionNameSupported);
};
