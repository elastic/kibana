/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AppContextTestRender } from '../../mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../mock/endpoint';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { AlertResponseActionsSupport } from './use_alert_response_actions_support';
import { useAlertResponseActionsSupport } from './use_alert_response_actions_support';
import { isAgentTypeAndActionSupported } from '../../lib/endpoint';

describe('When using `useAlertResponseActionsSupport()` hook', () => {
  let alertDetailItemData: TimelineEventsDetailsItem[];
  let renderHook: () => ReturnType<AppContextTestRender['renderHook']>;

  beforeEach(() => {
    const appContextMock = createAppRootMockRenderer();

    // Enable feature flags by default
    appContextMock.setExperimentalFlag({
      responseActionsSentinelOneV1Enabled: true,
      responseActionsSentinelOneGetFileEnabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
    });

    alertDetailItemData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();
    renderHook = () =>
      appContextMock.renderHook(() => useAlertResponseActionsSupport(alertDetailItemData));
  });

  // TODO:PT Loop through all conditions
  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should return expected response for agentType: `%s`',
    (agentType) => {
      alertDetailItemData =
        endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(agentType);
      const { result } = renderHook();

      expect(result.current).toEqual({
        isAlert: true,
        isSupported: true,
        details: {
          agentId: 'abfe4a35-d5b4-42a0-a539-bd054c791769',
          agentIdField: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD[agentType],
          agentSupport: RESPONSE_ACTION_API_COMMANDS_NAMES.reduce((acc, commandName) => {
            acc[commandName] = isAgentTypeAndActionSupported(agentType, commandName);
            return acc;
          }, {} as AlertResponseActionsSupport['details']['agentSupport']),
          agentType,
          hostName: 'elastic-host-win',
          platform: 'windows',
        },
      });
    }
  );

  // TODO:PT Loop through all conditions
  it.todo('should set `isSupported` to false for: %s');
});
