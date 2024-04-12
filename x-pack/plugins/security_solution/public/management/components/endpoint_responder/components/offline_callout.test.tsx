/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import React from 'react';
import type { HostInfo } from '../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import {
  useAgentStatusHook,
  useGetAgentStatus,
  useGetSentinelOneAgentStatus,
} from '../../../../detections/components/host_isolation/use_sentinelone_host_isolation';
import { useGetEndpointDetails } from '../../../hooks/endpoint/use_get_endpoint_details';
import { mockEndpointDetailsApiResult } from '../../../pages/endpoint_hosts/store/mock_endpoint_result_list';
import { OfflineCallout } from './offline_callout';

jest.mock('../../../hooks/endpoint/use_get_endpoint_details');
jest.mock('../../../../detections/components/host_isolation/use_sentinelone_host_isolation');

const getEndpointDetails = useGetEndpointDetails as jest.Mock;
const getSentinelOneAgentStatus = useGetSentinelOneAgentStatus as jest.Mock;
const getAgentStatus = useGetAgentStatus as jest.Mock;
const useAgentStatusHookMock = useAgentStatusHook as jest.Mock;

describe('Responder offline callout', () => {
  // TODO:
  // remove the sentinelOneAgentStatus hook when
  // agentStatusClientEnabled is enabled and removed
  describe.each([
    [useGetSentinelOneAgentStatus, getSentinelOneAgentStatus],
    [useGetAgentStatus, getAgentStatus],
  ])('works with %s hook', (hook, mockHook) => {
    let render: (agentType?: ResponseActionAgentType) => ReturnType<AppContextTestRender['render']>;
    let renderResult: ReturnType<typeof render>;
    let mockedContext: AppContextTestRender;
    let endpointDetails: HostInfo;

    beforeEach(() => {
      mockedContext = createAppRootMockRenderer();
      render = (agentType?: ResponseActionAgentType) =>
        (renderResult = mockedContext.render(
          <OfflineCallout
            endpointId={'1234'}
            agentType={agentType || 'endpoint'}
            hostName="Host name"
          />
        ));
      endpointDetails = mockEndpointDetailsApiResult();
      getEndpointDetails.mockReturnValue({ data: endpointDetails });
      mockHook.mockReturnValue({ data: {} });
      useAgentStatusHookMock.mockImplementation(() => hook);
      render();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it.each(['endpoint', 'sentinel_one'] as ResponseActionAgentType[])(
      'should be visible when agent type is %s and host is offline',
      (agentType) => {
        if (agentType === 'endpoint') {
          getEndpointDetails.mockReturnValue({
            data: { ...endpointDetails, host_status: HostStatus.OFFLINE },
          });
        } else if (agentType === 'sentinel_one') {
          mockHook.mockReturnValue({
            data: {
              '1234': {
                status: HostStatus.OFFLINE,
              },
            },
          });
        }
        render(agentType);
        const callout = renderResult.queryByTestId('offlineCallout');
        expect(callout).toBeTruthy();
      }
    );

    it.each(['endpoint', 'sentinel_one'] as ResponseActionAgentType[])(
      'should not be visible when agent type is %s and host is online',
      (agentType) => {
        if (agentType === 'endpoint') {
          getEndpointDetails.mockReturnValue({
            data: { ...endpointDetails, host_status: HostStatus.HEALTHY },
          });
        } else if (agentType === 'sentinel_one') {
          mockHook.mockReturnValue({
            data: {
              '1234': {
                status: HostStatus.HEALTHY,
              },
            },
          });
        }
        render(agentType);
        const callout = renderResult.queryByTestId('offlineCallout');
        expect(callout).toBeFalsy();
      }
    );
  });
});
