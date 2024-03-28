/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useResponderActionData } from './use_responder_action_data';
import { renderHook } from '@testing-library/react-hooks';
import { useGetEndpointDetails } from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../management/hooks', () => ({
  useGetEndpointDetails: (jest.fn() as jest.Mock).mockImplementation(() => ({ enabled: false })),
  useWithShowResponder: jest.fn(),
}));

const useGetEndpointDetailsMock = useGetEndpointDetails as jest.Mock;
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('#useResponderActionData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return `responder` menu item as `disabled` if agentType is not `endpoint` and feature flag is enabled', () => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useResponderActionData({
        endpointId: 'some-agent-type-id',
        // @ts-expect-error this is for testing purpose
        agentType: 'some_agent_type',
        eventData: [],
      })
    );
    expect(result.current.isDisabled).toEqual(true);
  });

  describe('when agentType is `endpoint`', () => {
    it.each(Object.values(HostStatus).filter((status) => status !== 'unenrolled'))(
      'should return `responder` menu item as `enabled `if agentType is `endpoint` when endpoint is %s',
      (hostStatus) => {
        useGetEndpointDetailsMock.mockReturnValue({
          data: {
            host_status: hostStatus,
          },
          isFetching: false,
          error: undefined,
        });
        const { result } = renderHook(() =>
          useResponderActionData({
            endpointId: 'endpoint-id',
            agentType: 'endpoint',
          })
        );
        expect(result.current.isDisabled).toEqual(false);
      }
    );

    it('should return responder menu item `disabled` if agentType is `endpoint` when endpoint is `unenrolled`', () => {
      useGetEndpointDetailsMock.mockReturnValue({
        data: {
          host_status: 'unenrolled',
        },
        isFetching: false,
        error: undefined,
      });
      const { result } = renderHook(() =>
        useResponderActionData({
          endpointId: 'endpoint-id',
          agentType: 'endpoint',
        })
      );
      expect(result.current.isDisabled).toEqual(true);
    });

    it('should return responder menu item `disabled` if agentType is `endpoint` when endpoint data has error', () => {
      useGetEndpointDetailsMock.mockReturnValue({
        data: {
          host_status: 'online',
        },
        isFetching: false,
        error: new Error('uh oh!'),
      });
      const { result } = renderHook(() =>
        useResponderActionData({
          endpointId: 'endpoint-id',
          agentType: 'endpoint',
        })
      );
      expect(result.current.isDisabled).toEqual(true);
    });

    it('should return responder menu item `disabled` if agentType is `endpoint` and endpoint data is fetching', () => {
      useGetEndpointDetailsMock.mockReturnValue({
        data: undefined,
        isFetching: true,
        error: undefined,
      });

      const { result } = renderHook(() =>
        useResponderActionData({
          endpointId: 'endpoint-id',
          agentType: 'endpoint',
        })
      );
      expect(result.current.isDisabled).toEqual(true);
    });
  });

  describe('when agentType is `sentinel_one`', () => {
    it('should return `responder` menu item as `disabled` if agentType is `sentinel_one` and feature flag is disabled', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);

      const { result } = renderHook(() =>
        useResponderActionData({
          endpointId: 'sentinel-one-id',
          agentType: 'sentinel_one',
          eventData: [],
        })
      );
      expect(result.current.isDisabled).toEqual(true);
    });

    it('should return `responder` menu item as `enabled `if agentType is `sentinel_one` and feature flag is enabled', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      const { result } = renderHook(() =>
        useResponderActionData({
          endpointId: 'sentinel-one-id',
          agentType: 'sentinel_one',
          eventData: [],
        })
      );
      expect(result.current.isDisabled).toEqual(false);
    });
  });
});
