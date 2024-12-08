/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllEDRActions } from './constants';
import {
  type ResponseActionAgentType,
  type EDRActionsApiCommandNames,
  type ResponseActionType,
} from './constants';

type SupportMap = Record<
  AllEDRActions,
  Record<ResponseActionType, Record<ResponseActionAgentType, boolean>>
>;

/** @private */
const RESPONSE_ACTIONS_SUPPORT_MAP: SupportMap = {
  isolate: {
    automated: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: true,
    },
  },
  unisolate: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: true,
    },
  },
  upload: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
  },
  'get-file': {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: false,
    },
  },
  'kill-process': {
    automated: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: false,
    },
  },
  execute: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
  },
  'suspend-process': {
    automated: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
  },
  'running-processes': {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: false,
    },
  },
  scan: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
    },
  },
  runscript: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: true,
    },
  },
};

/**
 * Check if a given Response action is supported (implemented) for a given agent type and action type
 * @param agentType
 * @param actionName
 * @param actionType
 */
export const isActionSupportedByAgentType = (
  agentType: ResponseActionAgentType,
  actionName: EDRActionsApiCommandNames<typeof agentType>,
  actionType: ResponseActionType
): boolean => {
  return RESPONSE_ACTIONS_SUPPORT_MAP[actionName][actionType][agentType];
};
