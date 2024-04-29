/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ResponseActionAgentType,
  type ResponseActionsApiCommandNames,
  type ResponseActionType,
} from './constants';

type SupportMap = Record<
  ResponseActionsApiCommandNames,
  Record<ResponseActionType, Record<ResponseActionAgentType, boolean>>
>;

/** @private */
const RESPONSE_ACTIONS_SUPPORT_MAP: SupportMap = {
  isolate: {
    automated: {
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
    },
  },
  unisolate: {
    automated: {
      endpoint: false,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
    },
  },
  upload: {
    automated: {
      endpoint: false,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
    },
  },
  'get-file': {
    automated: {
      endpoint: false,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
    },
  },
  'kill-process': {
    automated: {
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
    },
  },
  execute: {
    automated: {
      endpoint: false,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
    },
  },
  'suspend-process': {
    automated: {
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
    },
  },
  'running-processes': {
    automated: {
      endpoint: false,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
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
  actionName: ResponseActionsApiCommandNames,
  actionType: ResponseActionType
): boolean => {
  return RESPONSE_ACTIONS_SUPPORT_MAP[actionName][actionType][agentType];
};
