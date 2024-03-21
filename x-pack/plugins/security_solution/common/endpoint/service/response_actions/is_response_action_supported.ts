/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRbacControl } from './utils';
import type { EndpointPrivileges } from '../../types';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  type ResponseActionAgentType,
  type ResponseActionsApiCommandNames,
  type ResponseActionType,
} from './constants';

type SupportMap = Record<
  ResponseActionsApiCommandNames,
  Record<ResponseActionType, Record<ResponseActionAgentType, boolean>>
>;

/** @private */
const getResponseActionsSupportMap = ({
  agentType,
  actionName,
  actionType,
  privileges,
}: {
  agentType: ResponseActionAgentType;
  actionName: ResponseActionsApiCommandNames;
  actionType: ResponseActionType;
  privileges: EndpointPrivileges;
}): boolean => {
  const commandName = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[actionName];
  const RESPONSE_ACTIONS_SUPPORT_MAP = {
    [actionName]: {
      automated: {
        [agentType]:
          agentType === 'endpoint'
            ? getRbacControl({
                commandName,
                privileges,
              })
            : false,
      },
      manual: {
        [agentType]:
          agentType === 'endpoint'
            ? getRbacControl({
                commandName,
                privileges,
              })
            : actionName === 'isolate' || actionName === 'unisolate',
      },
    },
  } as SupportMap;
  return RESPONSE_ACTIONS_SUPPORT_MAP[actionName][actionType][agentType];
};

/**
 * Determine if a given response action is currently supported
 * @param agentType
 * @param actionName
 * @param actionType
 * @param privileges
 */
export const isResponseActionSupported = (
  agentType: ResponseActionAgentType,
  actionName: ResponseActionsApiCommandNames,
  actionType: ResponseActionType,
  privileges: EndpointPrivileges
): boolean => {
  return getResponseActionsSupportMap({
    privileges,
    actionName,
    actionType,
    agentType,
  });
};

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
  upload: {
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
  'get-file': {
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
  'kill-process': {
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
  execute: {
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
};

// FIXME:PT reemove once this module is refactored.
export const isActionSupportedByAgentType = (
  agentType: ResponseActionAgentType,
  actionName: ResponseActionsApiCommandNames,
  actionType: ResponseActionType
): boolean => {
  return RESPONSE_ACTIONS_SUPPORT_MAP[actionName][actionType][agentType];
};
