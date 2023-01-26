/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HostInfo } from '../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { useGetEndpointDetails } from '../../../hooks/endpoint/use_get_endpoint_details';
import { mockEndpointDetailsApiResult } from '../../../pages/endpoint_hosts/store/mock_endpoint_result_list';
import { OfflineCallout } from './offline_callout';

jest.mock('../../../hooks/endpoint/use_get_endpoint_details');

const getEndpointDetails = useGetEndpointDetails as jest.Mock;

describe('Responder offline callout', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let endpointDetails: HostInfo;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = () => (renderResult = mockedContext.render(<OfflineCallout endpointId={'1234'} />));
    endpointDetails = mockEndpointDetailsApiResult();
    getEndpointDetails.mockReturnValue({ data: endpointDetails });
    render();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be visible when endpoint is offline', () => {
    getEndpointDetails.mockReturnValue({
      data: { ...endpointDetails, host_status: HostStatus.OFFLINE },
    });
    render();
    const callout = renderResult.queryByTestId('offlineCallout');
    expect(callout).toBeTruthy();
  });
  it('should not be visible when endpoint is online', () => {
    getEndpointDetails.mockReturnValue({
      data: { ...endpointDetails, host_status: HostStatus.HEALTHY },
    });
    render();
    const callout = renderResult.queryByTestId('offlineCallout');
    expect(callout).toBeFalsy();
  });
});
