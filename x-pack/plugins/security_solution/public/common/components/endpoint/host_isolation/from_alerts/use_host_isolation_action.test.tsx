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
} from '../../../../../management/hooks/agents/use_get_agent_status';
import { useIsExperimentalFeatureEnabled } from '../../../../hooks/use_experimental_features';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ExperimentalFeaturesService as ExperimentalFeaturesServiceMock } from '../../../../experimental_features_service';
import { endpointAlertDataMock } from '../../../../mock/endpoint';

jest.mock('../../../../../management/hooks/agents/use_get_agent_status');
jest.mock('../../../../hooks/use_experimental_features');
jest.mock('../../../../experimental_features_service');

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
const useGetSentinelOneAgentStatusMock = useGetSentinelOneAgentStatus as jest.Mock;
const useGetAgentStatusMock = useGetAgentStatus as jest.Mock;
const useAgentStatusHookMock = useAgentStatusHook as jest.Mock;

describe('useHostIsolationAction', () => {
  const setFeatureFlags = (isEnabled: boolean = true): void => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(isEnabled);
    (ExperimentalFeaturesServiceMock.get as jest.Mock).mockReturnValue({
      responseActionsSentinelOneV1Enabled: isEnabled,
      responseActionsCrowdstrikeManualHostIsolationEnabled: isEnabled,
    });
  };

  const createReactQueryWrapper = () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  it('should NOT return the menu item for Events', () => {
    useAgentStatusHookMock.mockImplementation(() => {
      return jest.fn(() => {
        return { data: {} };
      });
    });
    setFeatureFlags(true);
    const { result } = renderHook(
      () => {
        return useHostIsolationAction({
          closePopover: jest.fn(),
          detailsData: endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo', {
            'kibana.alert.rule.uuid': undefined,
          }),
          isHostIsolationPanelOpen: false,
          onAddIsolationStatusClick: jest.fn(),
        });
      },
      { wrapper: createReactQueryWrapper() }
    );

    expect(result.current).toHaveLength(0);
  });

  // FIXME:PT refactor describe below - its not actually testing the component! Tests seem to be for `useAgentStatusHook()`
  describe.each([
    ['useGetSentinelOneAgentStatus', useGetSentinelOneAgentStatusMock],
    ['useGetAgentStatus', useGetAgentStatusMock],
  ])('works with %s hook', (name, hook) => {
    const render = (agentTypeAlert: ResponseActionAgentType) =>
      renderHook(
        () =>
          useHostIsolationAction({
            closePopover: jest.fn(),
            detailsData:
              endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(agentTypeAlert),
            isHostIsolationPanelOpen: false,
            onAddIsolationStatusClick: jest.fn(),
          }),
        {
          wrapper: createReactQueryWrapper(),
        }
      );

    beforeEach(() => {
      useAgentStatusHookMock.mockImplementation(() => hook);
      setFeatureFlags(true);
    });

    afterEach(() => {
      jest.clearAllMocks();
      (ExperimentalFeaturesServiceMock.get as jest.Mock).mockReset();
    });

    it(`${name} is invoked as 'enabled' when SentinelOne alert and FF enabled`, () => {
      render('sentinel_one');

      expect(hook).toHaveBeenCalledWith(['abfe4a35-d5b4-42a0-a539-bd054c791769'], 'sentinel_one', {
        enabled: true,
      });
    });
    it(`${name} is invoked as 'enabled' when Crowdstrike alert and FF enabled`, () => {
      render('crowdstrike');

      expect(hook).toHaveBeenCalledWith(['abfe4a35-d5b4-42a0-a539-bd054c791769'], 'crowdstrike', {
        enabled: true,
      });
    });

    it(`${name} is invoked as 'disabled' when SentinelOne alert and FF disabled`, () => {
      setFeatureFlags(false);
      render('sentinel_one');

      expect(hook).toHaveBeenCalledWith(['abfe4a35-d5b4-42a0-a539-bd054c791769'], 'sentinel_one', {
        enabled: false,
      });
    });

    it(`${name} is invoked as 'disabled' when Crowdstrike alert and FF disabled`, () => {
      setFeatureFlags(false);
      render('crowdstrike');

      expect(hook).toHaveBeenCalledWith(['abfe4a35-d5b4-42a0-a539-bd054c791769'], 'crowdstrike', {
        enabled: false,
      });
    });

    it(`${name} is invoked as 'disabled' when endpoint alert`, () => {
      render('endpoint');

      expect(hook).toHaveBeenCalledWith(['abfe4a35-d5b4-42a0-a539-bd054c791769'], 'endpoint', {
        enabled: false,
      });
    });
  });
});
