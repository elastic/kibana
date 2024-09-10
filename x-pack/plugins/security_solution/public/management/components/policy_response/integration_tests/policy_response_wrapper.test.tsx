/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import type { PolicyResponseWrapperProps } from '../policy_response_wrapper';
import { PolicyResponseWrapper } from '../policy_response_wrapper';
import { HostPolicyResponseActionStatus } from '../../../../../common/search_strategy';
import { useGetEndpointPolicyResponse } from '../../../hooks/endpoint/use_get_endpoint_policy_response';
import type {
  HostPolicyResponse,
  HostPolicyResponseAppliedAction,
} from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { useGetEndpointDetails } from '../../../hooks';
import {
  descriptions,
  LINUX_DEADLOCK_MESSAGE,
  policyResponseTitles,
} from '../policy_response_friendly_names';

jest.mock('../../../hooks/endpoint/use_get_endpoint_policy_response');
jest.mock('../../../hooks/endpoint/use_get_endpoint_details');

describe('when on the policy response', () => {
  const docGenerator = new EndpointDocGenerator();
  const createPolicyResponse = (
    overallStatus: HostPolicyResponseActionStatus = HostPolicyResponseActionStatus.success,
    extraActions: HostPolicyResponseAppliedAction[] = [
      {
        name: 'download_model',
        message: 'Failed to apply a portion of the configuration (kernel)',
        status: overallStatus,
      },
    ]
  ): HostPolicyResponse => {
    const policyResponse = docGenerator.generatePolicyResponse();
    const malwareResponseConfigurations =
      policyResponse.Endpoint.policy.applied.response.configurations.malware;
    policyResponse.Endpoint.policy.applied.status = overallStatus;
    malwareResponseConfigurations.status = overallStatus;

    // remove existing extra actions so no dupes when we add them in later
    Object.values(policyResponse.Endpoint.policy.applied.response.configurations).forEach(
      (responseConfiguration) => {
        extraActions.forEach((extraAction) => {
          let extraActionIndex = responseConfiguration.concerned_actions.indexOf(extraAction.name);
          // generator can pick same action multiple times
          while (extraActionIndex !== -1) {
            responseConfiguration.concerned_actions.splice(extraActionIndex, 1);
            extraActionIndex = responseConfiguration.concerned_actions.indexOf(extraAction.name);
          }
        });
      }
    );

    extraActions.forEach((extraAction) => {
      let foundExtraAction = policyResponse.Endpoint.policy.applied.actions.find(
        (action) => action.name === extraAction.name
      );

      if (!foundExtraAction) {
        foundExtraAction = extraAction;
        policyResponse.Endpoint.policy.applied.actions.push(foundExtraAction);
      } else {
        // Else, make sure the status of the generated action matches what was passed in
        foundExtraAction.status = overallStatus;
        foundExtraAction.message = extraAction.message;
      }

      // Make sure that at least one configuration has the above action, else
      // we get into an out-of-sync condition
      if (malwareResponseConfigurations.concerned_actions.indexOf(foundExtraAction.name) === -1) {
        malwareResponseConfigurations.concerned_actions.push(foundExtraAction.name);
      }
    });

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
  const useGetEndpointDetailsMock = useGetEndpointDetails as jest.Mock;
  let render: (
    props?: Partial<PolicyResponseWrapperProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderOpenedTree: () => Promise<ReturnType<AppContextTestRender['render']>>;
  const runMock = (customPolicyResponse?: HostPolicyResponse, os = 'macOS'): void => {
    commonPolicyResponse = customPolicyResponse ?? createPolicyResponse();
    useGetEndpointPolicyResponseMock.mockReturnValue({
      data: { policy_response: commonPolicyResponse },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    useGetEndpointDetailsMock.mockReturnValue({
      data: {
        metadata: { host: { os: { name: os } } },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    render = (props = {}) =>
      mockedContext.render(<PolicyResponseWrapper endpointId="id" {...props} />);
    renderOpenedTree = async () => {
      const component = render();
      await userEvent.click(component.getByTestId('endpointPolicyResponseTitle'));

      const configs = component.queryAllByTestId('endpointPolicyResponseConfig');
      for (const config of configs) {
        await userEvent.click(config);
      }

      const actions = component.queryAllByTestId('endpointPolicyResponseAction');
      for (const action of actions) {
        await userEvent.click(action);
      }
      const artifactsTitle = component.getByTestId('endpointPolicyResponseArtifactsTitle');

      await userEvent.click(artifactsTitle);

      const globalArtifacts = component.getByTestId(`endpointPolicyResponseArtifactGlobal`);
      const userArtifacts = component.getByTestId(`endpointPolicyResponseArtifactUser`);

      await userEvent.click(globalArtifacts);
      await userEvent.click(userArtifacts);

      return component;
    };
  });

  it('should include the title as the first tree element', async () => {
    runMock();
    expect((await render().findByTestId('endpointPolicyResponseTitle')).textContent).toBe(
      'Policy Response'
    );
  });

  it('should display timestamp', () => {
    runMock();
    const timestamp = render().queryByTestId('endpointPolicyResponseTimestamp');
    expect(timestamp).not.toBeNull();
  });

  it('should hide timestamp', () => {
    runMock();
    const timestamp = render({ showRevisionMessage: false }).queryByTestId(
      'endpointPolicyResponseTimestamp'
    );
    expect(timestamp).toBeNull();
  });

  it('should show a configuration section for each protection', async () => {
    runMock();
    const component = await renderOpenedTree();

    const configTree = await component.findAllByTestId('endpointPolicyResponseConfig');
    expect(configTree).toHaveLength(
      Object.keys(commonPolicyResponse.Endpoint.policy.applied.response.configurations).length
    );
  });

  it('should show an actions section for each configuration', async () => {
    runMock();
    const component = await renderOpenedTree();

    const configs = component.queryAllByTestId('endpointPolicyResponseConfig');
    const actions = component.queryAllByTestId('endpointPolicyResponseAction');

    /*
    // Uncomment this when commented tests are fixed.
     const statusAttentionHealth = component.queryAllByTestId(
       'endpointPolicyResponseStatusAttentionHealth'
     );
     const statusSuccessHealth = component.queryAllByTestId(
       'endpointPolicyResponseStatusSuccessHealth'
     );
     const messages = component.queryAllByTestId('endpointPolicyResponseMessage');
    */

    let expectedActionAccordionCount = 0;
    const configurationKeys = Object.keys(
      commonPolicyResponse.Endpoint.policy.applied.response.configurations
    );
    configurationKeys.forEach((key) => {
      expectedActionAccordionCount +=
        commonPolicyResponse.Endpoint.policy.applied.response.configurations[
          key as keyof HostPolicyResponse['Endpoint']['policy']['applied']['response']['configurations']
        ].concerned_actions.length;
    });

    expect(configs).toHaveLength(configurationKeys.length);
    expect(actions).toHaveLength(expectedActionAccordionCount);
    // FIXME:  for some reason it is not getting all messages items from DOM even those are rendered.
    // expect(messages).toHaveLength(expectedActionAccordionCount);
    // expect([...statusSuccessHealth, ...statusAttentionHealth]).toHaveLength(
    //   expectedActionAccordionCount + configurationKeys.length + 1
    // );
  });

  it('should show a configuration section for artifacts', async () => {
    runMock();
    const component = await renderOpenedTree();

    const globalArtifacts = component.getByTestId(`endpointPolicyResponseArtifactGlobal`);
    const userArtifacts = component.getByTestId(`endpointPolicyResponseArtifactUser`);
    expect(globalArtifacts.textContent).toBe(
      `Global (v${commonPolicyResponse.Endpoint.policy.applied.artifacts.global.version})`
    );
    expect(userArtifacts.textContent).toBe(
      `User (v${commonPolicyResponse.Endpoint.policy.applied.artifacts.user.version})`
    );
  });

  it('should show artifact section for each configuration section', async () => {
    runMock();
    const component = await renderOpenedTree();

    const artifacts = [
      ...commonPolicyResponse.Endpoint.policy.applied.artifacts.global.identifiers,
      ...commonPolicyResponse.Endpoint.policy.applied.artifacts.user.identifiers,
    ];

    const names = component.queryAllByTestId('endpointPolicyResponseArtifactName');
    const sha256s = component.queryAllByTestId('endpointPolicyResponseArtifactSha256');
    const copyButtons = component.queryAllByTestId('endpointPolicyResponseArtifactCopyButton');

    expect(names).toHaveLength(artifacts.length);
    expect(sha256s).toHaveLength(artifacts.length);
    expect(copyButtons).toHaveLength(artifacts.length);
    expect(names[0].textContent).toBe(artifacts[0].name);
    expect(names[1].textContent).toBe(artifacts[1].name);
    expect(sha256s[0].textContent).toContain(artifacts[0].sha256.substring(0, 5)); // Rendered sha256 is truncated
    expect(sha256s[1].textContent).toContain(artifacts[1].sha256.substring(0, 5));
  });

  it('should not show any numbered badges if all actions are successful', async () => {
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
    const component = await renderOpenedTree();

    const attentionBadge = await component.findAllByTestId(
      'endpointPolicyResponseStatusAttentionHealth'
    );
    expect(attentionBadge).not.toHaveLength(0);
  });

  it('should show a numbered badge if at least one action has a warning', async () => {
    const policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.warning);

    runMock(policyResponse);
    const component = await renderOpenedTree();

    const attentionBadge = await component.findAllByTestId(
      'endpointPolicyResponseStatusAttentionHealth'
    );
    expect(attentionBadge).not.toHaveLength(0);
  });

  it('should format unknown policy action names', async () => {
    const policyResponse = createPolicyResponse();
    runMock(policyResponse);

    const component = await renderOpenedTree();
    expect(component.getByText('A New Unknown Action')).not.toBeNull();
  });

  it('should not display error callout if status success', async () => {
    const policyResponse = createPolicyResponse();
    policyResponse.Endpoint.policy.applied.actions.forEach(
      (action) => (action.status = HostPolicyResponseActionStatus.success)
    );
    runMock(policyResponse);
    const component = await renderOpenedTree();
    expect(component.queryAllByTestId('endpointPolicyResponseErrorCallOut')).toHaveLength(0);
  });

  describe('error callout', () => {
    let policyResponse: HostPolicyResponse;

    beforeEach(() => {
      policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.failure);
      runMock(policyResponse);
    });

    it('should not display link if type is NOT mapped', async () => {
      const component = await renderOpenedTree();
      const calloutLink = component.queryByTestId('endpointPolicyResponseErrorCallOutLink');
      expect(calloutLink).toBeNull();
    });

    it('should display link if type is mapped', async () => {
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

      const component = await renderOpenedTree();
      const calloutLinks = component.queryAllByTestId('endpointPolicyResponseErrorCallOutLink');
      expect(calloutLinks.length).toEqual(2);
    });

    it('should display correct description and link for macos_system_ext failure', async () => {
      policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.failure, [
        {
          name: 'connect_kernel',
          message: '',
          status: HostPolicyResponseActionStatus.failure,
        },
      ]);
      runMock(policyResponse);

      const component = await renderOpenedTree();

      const calloutTitles = component
        .queryAllByTestId('endpointPolicyResponseErrorCallOut')
        .filter((calloutTitle) =>
          calloutTitle.innerHTML.includes(policyResponseTitles.get('macos_system_ext')!)
        );
      expect(calloutTitles.length).toEqual(2);

      const calloutMessages = component
        .queryAllByTestId('endpointPolicyResponseErrorCallOut')
        .filter((calloutMessage) =>
          calloutMessage.innerHTML.includes(descriptions.get('macos_system_ext')!)
        );
      expect(calloutMessages.length).toEqual(2);

      const calloutLinks = component.queryAllByTestId('endpointPolicyResponseErrorCallOutLink');
      expect(calloutLinks.length).toEqual(2);
    });

    it.each(['load_malware_model', 'configure_malware'])(
      'should display correct description and link for linux_deadlock with %s failure',
      async (actionName: string) => {
        policyResponse = createPolicyResponse(HostPolicyResponseActionStatus.failure, [
          {
            name: actionName,
            message: LINUX_DEADLOCK_MESSAGE,
            status: HostPolicyResponseActionStatus.failure,
          },
        ]);
        runMock(policyResponse, 'Linux');

        const component = await renderOpenedTree();

        const calloutTitles = component
          .queryAllByTestId('endpointPolicyResponseErrorCallOut')
          .filter((calloutTitle) =>
            calloutTitle.innerHTML.includes(policyResponseTitles.get('linux_deadlock')!)
          );
        expect(calloutTitles.length).toEqual(2);

        // uncomment once we have an actual description
        // const calloutMessages = component
        //   .queryAllByTestId('endpointPolicyResponseErrorCallOut')
        //   .filter((calloutMessage) =>
        //     calloutMessage.innerHTML.includes(descriptions.get('linux_deadlock')!)
        //   );
        // expect(calloutMessages.length).toEqual(2);

        const calloutLinks = component.queryAllByTestId('endpointPolicyResponseErrorCallOutLink');
        expect(calloutLinks.length).toEqual(2);
      }
    );
  });
});
