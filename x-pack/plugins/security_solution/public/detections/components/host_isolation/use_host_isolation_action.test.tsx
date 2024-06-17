/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useHostIsolationAction } from './use_host_isolation_action';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAgentStatusHook,
  useGetAgentStatus,
  useGetSentinelOneAgentStatus,
} from '../../../management/hooks/agents/use_get_agent_status';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';

jest.mock('../../../management/hooks/agents/use_get_agent_status');
jest.mock('../../../common/hooks/use_experimental_features');

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
const useGetSentinelOneAgentStatusMock = useGetSentinelOneAgentStatus as jest.Mock;
const useGetAgentStatusMock = useGetAgentStatus as jest.Mock;
const useAgentStatusHookMock = useAgentStatusHook as jest.Mock;

describe('useHostIsolationAction', () => {
  describe.each([
    ['useGetSentinelOneAgentStatus', useGetSentinelOneAgentStatusMock],
    ['useGetAgentStatus', useGetAgentStatusMock],
  ])('works with %s hook', (name, hook) => {
    const createReactQueryWrapper = () => {
      const queryClient = new QueryClient();
      const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      return wrapper;
    };

    const render = (agentTypeAlert: ResponseActionAgentType) =>
      renderHook(
        () =>
          useHostIsolationAction({
            closePopover: jest.fn(),
            detailsData:
              agentTypeAlert === 'sentinel_one'
                ? [
                    {
                      category: 'kibana',
                      field: 'kibana.alert.rule.uuid',
                      isObjectArray: false,
                      values: ['ruleId'],
                      originalValue: ['ruleId'],
                    },
                    {
                      category: 'event',
                      field: 'event.module',
                      values: ['sentinel_one'],
                      originalValue: ['sentinel_one'],
                      isObjectArray: false,
                    },
                    {
                      category: 'observer',
                      field: 'observer.serial_number',
                      values: ['some-agent-id'],
                      originalValue: ['some-agent-id'],
                      isObjectArray: false,
                    },
                  ]
                : agentTypeAlert === 'crowdstrike'
                ? [
                    {
                      category: 'kibana',
                      field: 'kibana.alert.rule.uuid',
                      isObjectArray: false,
                      values: ['ruleId'],
                      originalValue: ['ruleId'],
                    },
                    {
                      category: 'event',
                      field: 'event.module',
                      values: ['crowdstrike'],
                      originalValue: ['crowdstrike'],
                      isObjectArray: false,
                    },
                    {
                      category: 'crowdstrike',
                      field: 'crowdstrike.event.DeviceId',
                      values: ['expectedCrowdstrikeAgentId'],
                      originalValue: ['expectedCrowdstrikeAgentId'],
                      isObjectArray: false,
                    },
                  ]
                : [
                    {
                      category: 'agent',
                      field: 'agent.id',
                      values: ['some-agent-id'],
                      originalValue: ['some-agent-id'],
                      isObjectArray: false,
                    },
                  ],
            isHostIsolationPanelOpen: false,
            onAddIsolationStatusClick: jest.fn(),
          }),
        {
          wrapper: createReactQueryWrapper(),
        }
      );

    beforeEach(() => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      useAgentStatusHookMock.mockImplementation(() => hook);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it(`${name} is invoked as 'enabled' when SentinelOne alert and FF enabled`, () => {
      render('sentinel_one');

      expect(hook).toHaveBeenCalledWith(['some-agent-id'], 'sentinel_one', {
        enabled: true,
      });
    });
    it(`${name} is invoked as 'enabled' when Crowdstrike alert and FF enabled`, () => {
      render('crowdstrike');

      expect(hook).toHaveBeenCalledWith(['expectedCrowdstrikeAgentId'], 'crowdstrike', {
        enabled: true,
      });
    });

    it(`${name} is invoked as 'disabled' when SentinelOne alert and FF disabled`, () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      render('sentinel_one');

      expect(hook).toHaveBeenCalledWith(['some-agent-id'], 'sentinel_one', {
        enabled: false,
      });
    });

    it(`${name} is invoked as 'disabled' when Crowdstrike alert and FF disabled`, () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      render('crowdstrike');

      expect(hook).toHaveBeenCalledWith(['expectedCrowdstrikeAgentId'], 'crowdstrike', {
        enabled: false,
      });
    });

    it(`${name} is invoked as 'disabled' when endpoint alert`, () => {
      render('endpoint');

      expect(hook).toHaveBeenCalledWith([''], 'endpoint', {
        enabled: false,
      });
    });
  });
});
