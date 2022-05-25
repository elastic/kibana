/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { PolicyResponseWrapper } from './policy_response_wrapper';
import { HostPolicyResponseActionStatus } from '../../../../common/search_strategy';
import { useGetEndpointPolicyResponse } from '../../hooks/endpoint/use_get_endpoint_policy_response';
import {
  HostPolicyResponse,
  HostPolicyResponseAppliedAction,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';

jest.mock('../../hooks/endpoint/use_get_endpoint_policy_response');

describe('when on the policy response', () => {
  const docGenerator = new EndpointDocGenerator();
  const createPolicyResponse = (
    overallStatus: HostPolicyResponseActionStatus = HostPolicyResponseActionStatus.success
  ): HostPolicyResponse => {
    const policyResponse = docGenerator.generatePolicyResponse();
    const malwareResponseConfigurations =
      policyResponse.Endpoint.policy.applied.response.configurations.malware;
    policyResponse.Endpoint.policy.applied.status = overallStatus;
    malwareResponseConfigurations.status = overallStatus;
    let downloadModelAction = policyResponse.Endpoint.policy.applied.actions.find(
      (action) => action.name === 'download_model'
    );

    if (!downloadModelAction) {
      downloadModelAction = {
        name: 'download_model',
        message: 'Failed to apply a portion of the configuration (kernel)',
        status: overallStatus,
      };
      policyResponse.Endpoint.policy.applied.actions.push(downloadModelAction);
    } else {
      // Else, make sure the status of the generated action matches what was passed in
      downloadModelAction.status = overallStatus;
    }

    if (
      overallStatus === HostPolicyResponseActionStatus.failure ||
      overallStatus === HostPolicyResponseActionStatus.warning
    ) {
      downloadModelAction.message = 'no action taken';
    }

    // Make sure that at least one configuration has the above action, else
    // we get into an out-of-sync condition
    if (malwareResponseConfigurations.concerned_actions.indexOf(downloadModelAction.name) === -1) {
      malwareResponseConfigurations.concerned_actions.push(downloadModelAction.name);
    }

    // Add an unknown Action Name - to ensure we handle the format of it on the UI
    const unknownAction: HostPolicyResponseAppliedAction = {
      status: HostPolicyResponseActionStatus.success,
      message: 'test message',
      name: 'a_new_unknown_action',
    };
    policyResponse.Endpoint.policy.applied.actions.push(unknownAction);
    malwareResponseConfigurations.concerned_actions.push(unknownAction.name);

    return policyResponse;
  };

  let commonPolicyResponse: HostPolicyResponse;

  const useGetEndpointPolicyResponseMock = useGetEndpointPolicyResponse as jest.Mock;
  let render: () => ReturnType<AppContextTestRender['render']>;
  const runMock = (customPolicyResponse?: HostPolicyResponse): void => {
    commonPolicyResponse = customPolicyResponse ?? createPolicyResponse();
    useGetEndpointPolicyResponseMock.mockReturnValue({
      data: { policy_response: commonPolicyResponse },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    render = () => mockedContext.render(<PolicyResponseWrapper endpointId="id" />);
  });

  it('should include the title', async () => {
    runMock();
    expect((await render().findByTestId('endpointDetailsPolicyResponseTitle')).textContent).toBe(
      'Policy Response'
    );
  });

  it('should display timestamp', () => {
    runMock();
    const timestamp = render().queryByTestId('endpointDetailsPolicyResponseTimestamp');
    expect(timestamp).not.toBeNull();
  });

  it('should show a configuration section for each protection', async () => {
    runMock();
    const configAccordions = await render().findAllByTestId(
      'endpointDetailsPolicyResponseConfigAccordion'
    );
    expect(configAccordions).toHaveLength(
      Object.keys(commonPolicyResponse.Endpoint.policy.applied.response.configurations).length
    );
  });

  it('should show an actions section for each configuration', async () => {
    runMock();
    const actionAccordions = await render().findAllByTestId(
      'endpointDetailsPolicyResponseActionsAccordion'
    );
    const action = await render().findAllByTestId('policyResponseAction');
    const statusHealth = await render().findAllByTestId('policyResponseStatusHealth');
    const message = await render().findAllByTestId('policyResponseMessage');

    let expectedActionAccordionCount = 0;
    Object.keys(commonPolicyResponse.Endpoint.policy.applied.response.configurations).forEach(
      (key) => {
        expectedActionAccordionCount +=
          commonPolicyResponse.Endpoint.policy.applied.response.configurations[
            key as keyof HostPolicyResponse['Endpoint']['policy']['applied']['response']['configurations']
          ].concerned_actions.length;
      }
    );
    expect(actionAccordions).toHaveLength(expectedActionAccordionCount);
    expect(action).toHaveLength(expectedActionAccordionCount * 2);
    expect(statusHealth).toHaveLength(expectedActionAccordionCount * 3);
    expect(message).toHaveLength(expectedActionAccordionCount * 4);
  });

  it('should not show any numbered badges if all actions are successful', () => {
    const policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.success);
    runMock(policyResponse);

    return render()
      .findAllByTestId('endpointDetailsPolicyResponseAttentionBadge')
      .catch((e) => {
        expect(e).not.toBeNull();
      });
  });

  it('should show a numbered badge if at least one action failed', async () => {
    const policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.failure);

    runMock(policyResponse);
    const attentionBadge = await render().findAllByTestId(
      'endpointDetailsPolicyResponseAttentionBadge'
    );
    expect(attentionBadge).not.toHaveLength(0);
  });

  it('should show a numbered badge if at least one action has a warning', async () => {
    const policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.warning);

    runMock(policyResponse);
    const attentionBadge = await render().findAllByTestId(
      'endpointDetailsPolicyResponseAttentionBadge'
    );
    expect(attentionBadge).not.toHaveLength(0);
  });

  it('should format unknown policy action names', async () => {
    const policyResponse = createPolicyResponse();
    runMock(policyResponse);

    expect(render().getByText('A New Unknown Action')).not.toBeNull();
  });

  it('should not display error callout if status success', () => {
    const policyResponse = createPolicyResponse();
    policyResponse.Endpoint.policy.applied.actions.forEach(
      (action) => (action.status = HostPolicyResponseActionStatus.success)
    );
    runMock(policyResponse);
    expect(render().queryAllByTestId('endpointPolicyResponseErrorCallOut')).toHaveLength(0);
  });

  describe('error callout', () => {
    let policyResponse: HostPolicyResponse;

    beforeEach(() => {
      policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.failure);
      runMock(policyResponse);
    });

    it('should display if status failure', () => {
      const callouts = render().queryAllByTestId('endpointPolicyResponseErrorCallOut');
      expect(callouts.length).toBeGreaterThanOrEqual(2);
      expect(callouts.length % 2).toEqual(0); // there are exactly 2 error callouts per failure, nested + bubbled up
    });

    it('should not display link if type is NOT mapped', () => {
      const calloutLink = render().queryByTestId('endpointPolicyResponseErrorCallOutLink');
      expect(calloutLink).toBeNull();
    });

    it('should display link if type is mapped', () => {
      const action = {
        name: 'full_disk_access',
        message:
          'You must enable full disk access for Elastic Endpoint on your machine. See our troubleshooting documentation for more information',
        status: HostPolicyResponseActionStatus.failure,
      };
      policyResponse.Endpoint.policy.applied.actions.push(action);
      policyResponse.Endpoint.policy.applied.response.configurations.malware.concerned_actions.push(
        'full_disk_access'
      );

      const calloutLinks = render().queryAllByTestId('endpointPolicyResponseErrorCallOutLink');
      expect(calloutLinks.length).toEqual(2);
    });
  });
});
