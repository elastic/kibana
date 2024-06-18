/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertResponseActionsSupport } from '../use_alert_response_actions_support';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD,
} from '../../../../../common/endpoint/service/response_actions/constants';

const useAlertResponseActionsSupportMock = (): AlertResponseActionsSupport => {
  return {
    isSupported: true,
    unsupportedReason: undefined,
    isAlert: true,
    details: {
      agentId: '123',
      agentType: 'endpoint',
      agentIdField: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.endpoint,
      hostName: 'host-a',
      platform: 'linux',
      agentSupport: RESPONSE_ACTION_API_COMMANDS_NAMES.reduce<
        AlertResponseActionsSupport['details']['agentSupport']
      >((acc, responseActionName) => {
        acc[responseActionName] = true;
        return acc;
      }, {} as AlertResponseActionsSupport['details']['agentSupport']),
    },
  };
};

export { useAlertResponseActionsSupportMock as useAlertResponseActionsSupport };
