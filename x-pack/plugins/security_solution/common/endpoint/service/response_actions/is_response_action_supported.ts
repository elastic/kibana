/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRbacControl, getUiCommand } from './utils';
import type { EndpointPrivileges } from '../../types';
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
  const commandName = getUiCommand(actionName);
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
