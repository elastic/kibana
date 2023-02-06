/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import type { HostInfo } from '../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { useGetEndpointDetails } from '../../../hooks/endpoint/use_get_endpoint_details';
import { useGetEndpointPendingActionsSummary } from '../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { mockEndpointDetailsApiResult } from '../../../pages/endpoint_hosts/store/mock_endpoint_result_list';
import { HeaderEndpointInfo } from './header_endpoint_info';

jest.mock('../../../hooks/endpoint/use_get_endpoint_details');
jest.mock('../../../hooks/response_actions/use_get_endpoint_pending_actions_summary');

const getEndpointDetails = useGetEndpointDetails as jest.Mock;
const getPendingActions = useGetEndpointPendingActionsSummary as jest.Mock;

describe('Responder header endpoint info', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let endpointDetails: HostInfo;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = () =>
      (renderResult = mockedContext.render(<HeaderEndpointInfo endpointId={'1234'} />));
    endpointDetails = mockEndpointDetailsApiResult();
    getEndpointDetails.mockReturnValue({ data: endpointDetails });
    getPendingActions.mockReturnValue({
      data: {
        data: [
          new EndpointActionGenerator('seed').generateAgentPendingActionsSummary({
            agent_id: '1234',
          }),
        ],
      },
    });
    render();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should show endpoint name', async () => {
    const name = await renderResult.findByTestId('responderHeaderEndpointName');
    expect(name.textContent).toBe(`${endpointDetails.metadata.host.name}`);
  });
  it('should show agent and isolation status', async () => {
    const agentStatus = await renderResult.findByTestId(
      'responderHeaderEndpointAgentIsolationStatus'
    );
    expect(agentStatus.textContent).toBe(`UnhealthyIsolating`);
  });
  it('should show last updated time', async () => {
    const lastUpdated = await renderResult.findByTestId('responderHeaderLastSeen');
    expect(lastUpdated).toBeTruthy();
  });
});
