/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
  ResponseActionType,
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
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
    },
  },
  upload: {
    automated: {
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
    },
  },
  'get-file': {
    automated: {
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
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
      endpoint: true,
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
      endpoint: true,
      sentinel_one: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
    },
  },
};

/**
 * Determine if a given response action is currently supported
 * @param agentType
 * @param actionName
 * @param actionType
 */
export const isResponseActionSupported = (
  agentType: ResponseActionAgentType,
  actionName: ResponseActionsApiCommandNames,
  actionType: ResponseActionType
): boolean => {
  return RESPONSE_ACTIONS_SUPPORT_MAP[actionName][actionType][agentType];
};
