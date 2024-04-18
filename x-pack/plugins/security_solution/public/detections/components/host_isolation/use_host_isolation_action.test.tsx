/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useHostIsolationAction } from './use_host_isolation_action';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAgentStatusHook,
  useGetAgentStatus,
  useGetSentinelOneAgentStatus,
} from './use_sentinelone_host_isolation';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('./use_sentinelone_host_isolation');
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
      const wrapper: React.FC = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      return wrapper;
    };

    const render = (isSentinelAlert: boolean = true) =>
      renderHook(
        () =>
          useHostIsolationAction({
            closePopover: jest.fn(),
            detailsData: isSentinelAlert
              ? [
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
      render();

      expect(hook).toHaveBeenCalledWith(['some-agent-id'], 'sentinel_one', {
        enabled: true,
      });
    });

    it(`${name} is invoked as 'disabled' when SentinelOne alert and FF disabled`, () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      render();

      expect(hook).toHaveBeenCalledWith(['some-agent-id'], 'sentinel_one', {
        enabled: false,
      });
    });

    it(`${name} is invoked as 'disabled' when non-SentinelOne alert`, () => {
      render(false);

      expect(hook).toHaveBeenCalledWith([''], 'sentinel_one', {
        enabled: false,
      });
    });
  });
});
