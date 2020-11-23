/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { EndpointList } from './index';
import '../../../../common/mock/match_media';

import {
  mockEndpointDetailsApiResult,
  mockEndpointResultList,
  setEndpointListApiMockImplementation,
} from '../store/mock_endpoint_result_list';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import {
  HostInfo,
  HostPolicyResponse,
  HostPolicyResponseActionStatus,
  HostPolicyResponseAppliedAction,
  HostStatus,
  MetadataQueryStrategyVersions,
} from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { POLICY_STATUS_TO_HEALTH_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import { mockPolicyResultList } from '../../policy/store/policy_list/test_mock_utils';

// not sure why this can't be imported from '../../../../common/mock/formatted_relative';
// but sure enough it needs to be inline in this one file
jest.mock('@kbn/i18n/react', () => {
  const originalModule = jest.requireActual('@kbn/i18n/react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
jest.mock('../../../../common/components/link_to');
jest.mock('../../policy/store/policy_list/services/ingest', () => {
  const originalModule = jest.requireActual('../../policy/store/policy_list/services/ingest');
  return {
    ...originalModule,
    sendGetEndpointSecurityPackage: () => Promise.resolve({}),
  };
});
describe('when on the list page', () => {
  const docGenerator = new EndpointDocGenerator();
  let render: () => ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store, coreStart, middlewareSpy } = mockedContext);
    render = () => mockedContext.render(<EndpointList />);
    reactTestingLibrary.act(() => {
      history.push('/endpoints');
    });
  });

  it('should NOT display timeline', async () => {
    const renderResult = render();
    const timelineFlyout = await renderResult.queryByTestId('flyoutOverlay');
    expect(timelineFlyout).toBeNull();
  });

  describe('when there are no endpoints or polices', () => {
    beforeEach(() => {
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
      });
    });

    it('should show the empty state when there are no hosts or polices', async () => {
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      // Initially, there are no hosts or policies, so we prompt to add policies first.
      const table = await renderResult.findByTestId('emptyPolicyTable');
      expect(table).not.toBeNull();
    });
  });

  describe('when there are policies, but no hosts', () => {
    beforeEach(async () => {
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should show the no hosts empty state', async () => {
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const emptyHostsTable = await renderResult.findByTestId('emptyHostsTable');
      expect(emptyHostsTable).not.toBeNull();
    });

    it('should display the onboarding steps', async () => {
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
      expect(onboardingSteps).not.toBeNull();
    });

    it('should show policy selection', async () => {
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingPolicySelect = await renderResult.findByTestId('onboardingPolicySelect');
      expect(onboardingPolicySelect).not.toBeNull();
    });
  });

  describe('when loading data with the query_strategy_version is `v1`', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        const mockedEndpointListData = mockEndpointResultList({
          total: 4,
          query_strategy_version: MetadataQueryStrategyVersions.VERSION_1,
        });
        setEndpointListApiMockImplementation(coreStart.http, {
          endpointsResults: mockedEndpointListData.hosts,
          queryStrategyVersion: mockedEndpointListData.query_strategy_version,
        });
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should not display the KQL bar', async () => {
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedEndpointList');
      });
      expect(renderResult.queryByTestId('adminSearchBar')).toBeNull();
    });
  });

  describe('when determining when to show the enrolling message', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should display the enrolling message when there are less Endpoints than Agents', async () => {
      reactTestingLibrary.act(() => {
        const mockedEndpointListData = mockEndpointResultList({
          total: 4,
        });
        setEndpointListApiMockImplementation(coreStart.http, {
          endpointsResults: mockedEndpointListData.hosts,
          totalAgentsUsingEndpoint: 5,
        });
      });
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedAgenstWithEndpointsTotal');
      });
      expect(renderResult.queryByTestId('endpointsEnrollingNotification')).not.toBeNull();
    });

    it('should NOT display the enrolling message when there are equal Endpoints than Agents', async () => {
      reactTestingLibrary.act(() => {
        const mockedEndpointListData = mockEndpointResultList({
          total: 5,
        });
        setEndpointListApiMockImplementation(coreStart.http, {
          endpointsResults: mockedEndpointListData.hosts,
          totalAgentsUsingEndpoint: 5,
        });
      });
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedAgenstWithEndpointsTotal');
      });
      expect(renderResult.queryByTestId('endpointsEnrollingNotification')).toBeNull();
    });

    it('should NOT display the enrolling message when there are more Endpoints than Agents', async () => {
      reactTestingLibrary.act(() => {
        const mockedEndpointListData = mockEndpointResultList({
          total: 6,
        });
        setEndpointListApiMockImplementation(coreStart.http, {
          endpointsResults: mockedEndpointListData.hosts,
          totalAgentsUsingEndpoint: 5,
        });
      });
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedAgenstWithEndpointsTotal');
      });
      expect(renderResult.queryByTestId('endpointsEnrollingNotification')).toBeNull();
    });
  });

  describe('when there is no selected host in the url', () => {
    it('should not show the flyout', () => {
      const renderResult = render();
      expect.assertions(1);
      return renderResult.findByTestId('endpointDetailsFlyout').catch((e) => {
        expect(e).not.toBeNull();
      });
    });
    describe('when list data loads', () => {
      const generatedPolicyStatuses: Array<
        HostInfo['metadata']['Endpoint']['policy']['applied']['status']
      > = [];
      let firstPolicyID: string;
      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const mockedEndpointData = mockEndpointResultList({ total: 4 });
          const hostListData = mockedEndpointData.hosts;
          const queryStrategyVersion = mockedEndpointData.query_strategy_version;

          firstPolicyID = hostListData[0].metadata.Endpoint.policy.applied.id;

          // add ability to change (immutable) policy
          type DeepMutable<T> = { -readonly [P in keyof T]: DeepMutable<T[P]> };
          type Policy = DeepMutable<NonNullable<HostInfo['policy_info']>>;

          const makePolicy = (
            applied: HostInfo['metadata']['Endpoint']['policy']['applied'],
            cb: (policy: Policy) => Policy
          ): Policy => {
            return cb({
              agent: {
                applied: { id: 'xyz', revision: applied.version },
                configured: { id: 'xyz', revision: applied.version },
              },
              endpoint: { id: applied.id, revision: applied.endpoint_policy_version },
            });
          };

          [
            { status: HostStatus.ERROR, policy: (p: Policy) => p },
            {
              status: HostStatus.ONLINE,
              policy: (p: Policy) => {
                p.endpoint.id = 'xyz'; // represents change in endpoint policy assignment
                p.endpoint.revision = 1;
                return p;
              },
            },
            {
              status: HostStatus.OFFLINE,
              policy: (p: Policy) => {
                p.endpoint.revision += 1; // changes made to endpoint policy
                return p;
              },
            },
            {
              status: HostStatus.UNENROLLING,
              policy: (p: Policy) => {
                p.agent.configured.revision += 1; // agent policy change, not propagated to agent yet
                return p;
              },
            },
          ].forEach((setup, index) => {
            hostListData[index] = {
              metadata: hostListData[index].metadata,
              host_status: setup.status,
              policy_info: makePolicy(
                hostListData[index].metadata.Endpoint.policy.applied,
                setup.policy
              ),
              query_strategy_version: queryStrategyVersion,
            };
          });
          hostListData.forEach((item, index) => {
            generatedPolicyStatuses[index] = item.metadata.Endpoint.policy.applied.status;
          });

          // Make sure that the first policy id in the host result is not set as non-existent
          const ingestPackagePolicies = mockPolicyResultList({ total: 1 }).items;
          ingestPackagePolicies[0].id = firstPolicyID;

          setEndpointListApiMockImplementation(coreStart.http, {
            endpointsResults: hostListData,
            endpointPackagePolicies: ingestPackagePolicies,
          });
        });
      });
      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should display rows in the table', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const rows = await renderResult.findAllByRole('row');
        expect(rows).toHaveLength(5);
      });
      it('should show total', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const total = await renderResult.findByTestId('endpointListTableTotal');
        expect(total.textContent).toEqual('4 Hosts');
      });
      it('should display correct status', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const hostStatuses = await renderResult.findAllByTestId('rowHostStatus');

        expect(hostStatuses[0].textContent).toEqual('Error');
        expect(hostStatuses[0].querySelector('[data-euiicon-type][color="danger"]')).not.toBeNull();

        expect(hostStatuses[1].textContent).toEqual('Online');
        expect(
          hostStatuses[1].querySelector('[data-euiicon-type][color="success"]')
        ).not.toBeNull();

        expect(hostStatuses[2].textContent).toEqual('Offline');
        expect(
          hostStatuses[2].querySelector('[data-euiicon-type][color="subdued"]')
        ).not.toBeNull();

        expect(hostStatuses[3].textContent).toEqual('Unenrolling');
        expect(
          hostStatuses[3].querySelector('[data-euiicon-type][color="warning"]')
        ).not.toBeNull();
      });

      it('should display correct policy status', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const policyStatuses = await renderResult.findAllByTestId('rowPolicyStatus');

        policyStatuses.forEach((status, index) => {
          expect(status.textContent).toEqual(POLICY_STATUS_TO_TEXT[generatedPolicyStatuses[index]]);
          expect(
            status.querySelector(
              `[data-euiicon-type][color=${
                POLICY_STATUS_TO_HEALTH_COLOR[generatedPolicyStatuses[index]]
              }]`
            )
          ).not.toBeNull();
        });
      });

      it('should display policy out-of-date warning when changes pending', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const outOfDates = await renderResult.findAllByTestId('rowPolicyOutOfDate');
        expect(outOfDates).toHaveLength(3);

        outOfDates.forEach((item, index) => {
          expect(item.textContent).toEqual('Out-of-date');
          expect(item.querySelector(`[data-euiicon-type][color=warning]`)).not.toBeNull();
        });
      });

      it('should display policy name as a link', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const firstPolicyName = (await renderResult.findAllByTestId('policyNameCellLink'))[0];
        expect(firstPolicyName).not.toBeNull();
        expect(firstPolicyName.getAttribute('href')).toContain(`policy/${firstPolicyID}`);
      });

      describe('when the user clicks the first hostname in the table', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          renderResult = render();
          await reactTestingLibrary.act(async () => {
            await middlewareSpy.waitForAction('serverReturnedEndpointList');
          });
          const hostNameLinks = await renderResult.findAllByTestId('hostnameCellLink');
          if (hostNameLinks.length) {
            reactTestingLibrary.fireEvent.click(hostNameLinks[0]);
          }
        });

        it('should show the flyout', () => {
          return renderResult.findByTestId('endpointDetailsFlyout').then((flyout) => {
            expect(flyout).not.toBeNull();
          });
        });
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/75721
  describe.skip('when polling on Endpoint List', () => {
    beforeEach(async () => {
      await reactTestingLibrary.act(() => {
        const hostListData = mockEndpointResultList({ total: 4 }).hosts;

        setEndpointListApiMockImplementation(coreStart.http, {
          endpointsResults: hostListData,
        });

        const pollInterval = 10;
        store.dispatch({
          type: 'userUpdatedEndpointListRefreshOptions',
          payload: {
            autoRefreshInterval: pollInterval,
          },
        });
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update data after some time', async () => {
      let renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedEndpointList');
      });
      const total = await renderResult.findAllByTestId('endpointListTableTotal');
      expect(total[0].textContent).toEqual('4 Hosts');

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: mockEndpointResultList({ total: 1 }).hosts,
      });

      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('appRequestedEndpointList');
        await middlewareSpy.waitForAction('serverReturnedEndpointList');
      });

      renderResult = render();

      const updatedTotal = await renderResult.findAllByTestId('endpointListTableTotal');
      expect(updatedTotal[0].textContent).toEqual('1 Host');
    });
  });

  describe('when there is a selected host in the url', () => {
    let hostDetails: HostInfo;
    let elasticAgentId: string;
    let renderAndWaitForData: () => Promise<ReturnType<AppContextTestRender['render']>>;
    const mockEndpointListApi = (mockedPolicyResponse?: HostPolicyResponse) => {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        host_status,
        metadata: { agent, ...details },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        query_strategy_version,
      } = mockEndpointDetailsApiResult();

      hostDetails = {
        host_status,
        metadata: {
          ...details,
          agent: {
            ...agent,
            id: '1',
          },
        },
        query_strategy_version,
      };

      elasticAgentId = hostDetails.metadata.elastic.agent.id;

      const policy = docGenerator.generatePolicyPackagePolicy();
      policy.id = hostDetails.metadata.Endpoint.policy.applied.id;

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [hostDetails],
        endpointPackagePolicies: [policy],
        policyResponse: mockedPolicyResponse,
      });
    };

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
      if (
        malwareResponseConfigurations.concerned_actions.indexOf(downloadModelAction.name) === -1
      ) {
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

    const dispatchServerReturnedEndpointPolicyResponse = (
      overallStatus: HostPolicyResponseActionStatus = HostPolicyResponseActionStatus.success
    ) => {
      reactTestingLibrary.act(() => {
        store.dispatch({
          type: 'serverReturnedEndpointPolicyResponse',
          payload: {
            policy_response: createPolicyResponse(overallStatus),
          },
        });
      });
    };

    beforeEach(async () => {
      mockEndpointListApi();

      reactTestingLibrary.act(() => {
        history.push('/endpoints?selected_endpoint=1');
      });

      renderAndWaitForData = async () => {
        const renderResult = render();
        await middlewareSpy.waitForAction('serverReturnedEndpointDetails');
        return renderResult;
      };
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should show the flyout', async () => {
      const renderResult = await renderAndWaitForData();
      return renderResult.findByTestId('endpointDetailsFlyout').then((flyout) => {
        expect(flyout).not.toBeNull();
      });
    });

    it('should display policy name value as a link', async () => {
      const renderResult = await renderAndWaitForData();
      const policyDetailsLink = await renderResult.findByTestId('policyDetailsValue');
      expect(policyDetailsLink).not.toBeNull();
      expect(policyDetailsLink.getAttribute('href')).toEqual(
        `/policy/${hostDetails.metadata.Endpoint.policy.applied.id}`
      );
    });

    it('should update the URL when policy name link is clicked', async () => {
      const renderResult = await renderAndWaitForData();
      const policyDetailsLink = await renderResult.findByTestId('policyDetailsValue');
      const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(policyDetailsLink);
      });
      const changedUrlAction = await userChangedUrlChecker;
      expect(changedUrlAction.payload.pathname).toEqual(
        `/policy/${hostDetails.metadata.Endpoint.policy.applied.id}`
      );
    });

    it('should display policy status value as a link', async () => {
      const renderResult = await renderAndWaitForData();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink).not.toBeNull();
      expect(policyStatusLink.getAttribute('href')).toEqual(
        '/endpoints?page_index=0&page_size=10&selected_endpoint=1&show=policy_response'
      );
    });

    it('should update the URL when policy status link is clicked', async () => {
      const renderResult = await renderAndWaitForData();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(policyStatusLink);
      });
      const changedUrlAction = await userChangedUrlChecker;
      expect(changedUrlAction.payload.search).toEqual(
        '?page_index=0&page_size=10&selected_endpoint=1&show=policy_response'
      );
    });

    it('should display Success overall policy status', async () => {
      const renderResult = await renderAndWaitForData();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Success');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="success"]')
      ).not.toBeNull();
    });

    it('should display Warning overall policy status', async () => {
      mockEndpointListApi(createPolicyResponse(HostPolicyResponseActionStatus.warning));
      const renderResult = await renderAndWaitForData();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Warning');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="warning"]')
      ).not.toBeNull();
    });

    it('should display Failed overall policy status', async () => {
      mockEndpointListApi(createPolicyResponse(HostPolicyResponseActionStatus.failure));
      const renderResult = await renderAndWaitForData();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Failed');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="danger"]')
      ).not.toBeNull();
    });

    it('should display Unknown overall policy status', async () => {
      mockEndpointListApi(createPolicyResponse('' as HostPolicyResponseActionStatus));
      const renderResult = await renderAndWaitForData();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Unknown');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="subdued"]')
      ).not.toBeNull();
    });

    it('should include the link to reassignment in Ingest', async () => {
      coreStart.application.getUrlForApp.mockReturnValue('/app/fleet');
      const renderResult = await renderAndWaitForData();
      const linkToReassign = await renderResult.findByTestId('endpointDetailsLinkToIngest');
      expect(linkToReassign).not.toBeNull();
      expect(linkToReassign.textContent).toEqual('Reassign Policy');
      expect(linkToReassign.getAttribute('href')).toEqual(
        `/app/fleet#/fleet/agents/${elasticAgentId}/activity?openReassignFlyout=true`
      );
    });

    describe('when link to reassignment in Ingest is clicked', () => {
      beforeEach(async () => {
        coreStart.application.getUrlForApp.mockReturnValue('/app/fleet');
        const renderResult = await renderAndWaitForData();
        const linkToReassign = await renderResult.findByTestId('endpointDetailsLinkToIngest');
        reactTestingLibrary.act(() => {
          reactTestingLibrary.fireEvent.click(linkToReassign);
        });
      });

      it('should navigate to Ingest without full page refresh', () => {
        expect(coreStart.application.navigateToApp.mock.calls).toHaveLength(1);
      });
    });

    describe('when showing host Policy Response panel', () => {
      let renderResult: ReturnType<typeof render>;
      beforeEach(async () => {
        coreStart.http.post.mockImplementation(async (requestOptions) => {
          if (requestOptions.path === '/api/endpoint/metadata') {
            return mockEndpointResultList({ total: 0 });
          }
          throw new Error(`POST to '${requestOptions.path}' does not have a mock response!`);
        });
        renderResult = await renderAndWaitForData();
        const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          reactTestingLibrary.fireEvent.click(policyStatusLink);
        });
        await userChangedUrlChecker;
        await middlewareSpy.waitForAction('serverReturnedEndpointPolicyResponse');
        reactTestingLibrary.act(() => {
          dispatchServerReturnedEndpointPolicyResponse();
        });
      });

      afterEach(reactTestingLibrary.cleanup);

      it('should hide the host details panel', async () => {
        const endpointDetailsFlyout = await renderResult.queryByTestId('endpointDetailsFlyoutBody');
        expect(endpointDetailsFlyout).toBeNull();
      });

      it('should display policy response sub-panel', async () => {
        expect(
          await renderResult.findByTestId('endpointDetailsPolicyResponseFlyoutHeader')
        ).not.toBeNull();
        expect(
          await renderResult.findByTestId('endpointDetailsPolicyResponseFlyoutBody')
        ).not.toBeNull();
      });

      it('should include the sub-panel title', async () => {
        expect(
          (await renderResult.findByTestId('endpointDetailsPolicyResponseFlyoutTitle')).textContent
        ).toBe('Policy Response');
      });

      it('should show a configuration section for each protection', async () => {
        const configAccordions = await renderResult.findAllByTestId(
          'endpointDetailsPolicyResponseConfigAccordion'
        );
        expect(configAccordions).not.toBeNull();
      });

      it('should show an actions section for each configuration', async () => {
        const actionAccordions = await renderResult.findAllByTestId(
          'endpointDetailsPolicyResponseActionsAccordion'
        );
        const action = await renderResult.findAllByTestId('policyResponseAction');
        const statusHealth = await renderResult.findAllByTestId('policyResponseStatusHealth');
        const message = await renderResult.findAllByTestId('policyResponseMessage');
        expect(actionAccordions).not.toBeNull();
        expect(action).not.toBeNull();
        expect(statusHealth).not.toBeNull();
        expect(message).not.toBeNull();
      });

      it('should not show any numbered badges if all actions are successful', () => {
        const policyResponse = docGenerator.generatePolicyResponse({
          ts: new Date().getTime(),
          allStatus: HostPolicyResponseActionStatus.success,
        });
        reactTestingLibrary.act(() => {
          store.dispatch({
            type: 'serverReturnedEndpointPolicyResponse',
            payload: {
              policy_response: policyResponse,
            },
          });
        });
        return renderResult
          .findAllByTestId('endpointDetailsPolicyResponseAttentionBadge')
          .catch((e) => {
            expect(e).not.toBeNull();
          });
      });

      it('should show a numbered badge if at least one action failed', async () => {
        const policyResponseActionDispatched = middlewareSpy.waitForAction(
          'serverReturnedEndpointPolicyResponse'
        );
        reactTestingLibrary.act(() => {
          dispatchServerReturnedEndpointPolicyResponse(HostPolicyResponseActionStatus.failure);
        });
        await policyResponseActionDispatched;
        const attentionBadge = await renderResult.findAllByTestId(
          'endpointDetailsPolicyResponseAttentionBadge'
        );
        expect(attentionBadge).not.toBeNull();
      });

      it('should show a numbered badge if at least one action has a warning', async () => {
        const policyResponseActionDispatched = middlewareSpy.waitForAction(
          'serverReturnedEndpointPolicyResponse'
        );
        reactTestingLibrary.act(() => {
          dispatchServerReturnedEndpointPolicyResponse(HostPolicyResponseActionStatus.warning);
        });
        await policyResponseActionDispatched;
        const attentionBadge = await renderResult.findAllByTestId(
          'endpointDetailsPolicyResponseAttentionBadge'
        );
        expect(attentionBadge).not.toBeNull();
      });

      it('should include the back to details link', async () => {
        const subHeaderBackLink = await renderResult.findByTestId('flyoutSubHeaderBackButton');
        expect(subHeaderBackLink.textContent).toBe('Endpoint Details');
        expect(subHeaderBackLink.getAttribute('href')).toBe(
          '/endpoints?page_index=0&page_size=10&selected_endpoint=1'
        );
      });

      it('should update URL when back to details link is clicked', async () => {
        const subHeaderBackLink = await renderResult.findByTestId('flyoutSubHeaderBackButton');
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          reactTestingLibrary.fireEvent.click(subHeaderBackLink);
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1'
        );
      });

      it('should format unknown policy action names', async () => {
        expect(renderResult.getByText('A New Unknown Action')).not.toBeNull();
      });
    });
  });

  describe('when the more actions column is opened', () => {
    let hostInfo: HostInfo;
    let agentId: string;
    let agentPolicyId: string;
    const generator = new EndpointDocGenerator('seed');
    let renderAndWaitForData: () => Promise<ReturnType<AppContextTestRender['render']>>;

    const mockEndpointListApi = () => {
      const { hosts, query_strategy_version: queryStrategyVersion } = mockEndpointResultList();
      hostInfo = {
        host_status: hosts[0].host_status,
        metadata: hosts[0].metadata,
        query_strategy_version: queryStrategyVersion,
      };
      const packagePolicy = docGenerator.generatePolicyPackagePolicy();
      packagePolicy.id = hosts[0].metadata.Endpoint.policy.applied.id;
      const agentPolicy = generator.generateAgentPolicy();
      agentPolicyId = agentPolicy.id;
      agentId = hosts[0].metadata.elastic.agent.id;

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [hostInfo],
        endpointPackagePolicies: [packagePolicy],
        agentPolicy,
      });
    };

    beforeEach(() => {
      mockEndpointListApi();

      reactTestingLibrary.act(() => {
        history.push('/endpoints');
      });

      renderAndWaitForData = async () => {
        const renderResult = render();
        await middlewareSpy.waitForAction('serverReturnedEndpointList');
        await middlewareSpy.waitForAction('serverReturnedEndpointAgentPolicies');
        return renderResult;
      };

      coreStart.application.getUrlForApp.mockImplementation((appName) => {
        switch (appName) {
          case 'securitySolution':
            return '/app/security';
          case 'fleet':
            return '/app/fleet';
        }
        return appName;
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to the Security Solution Host Details page', async () => {
      const renderResult = await renderAndWaitForData();
      // open the endpoint actions menu
      const endpointActionsButton = await renderResult.findByTestId('endpointTableRowActions');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });

      const hostLink = await renderResult.findByTestId('hostLink');
      expect(hostLink.getAttribute('href')).toEqual(
        `/app/security/hosts/${hostInfo.metadata.host.hostname}`
      );
    });
    it('navigates to the Ingest Agent Policy page', async () => {
      const renderResult = await renderAndWaitForData();
      const endpointActionsButton = await renderResult.findByTestId('endpointTableRowActions');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });

      const agentPolicyLink = await renderResult.findByTestId('agentPolicyLink');
      expect(agentPolicyLink.getAttribute('href')).toEqual(`/app/fleet#/policies/${agentPolicyId}`);
    });
    it('navigates to the Ingest Agent Details page', async () => {
      const renderResult = await renderAndWaitForData();
      const endpointActionsButton = await renderResult.findByTestId('endpointTableRowActions');
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });

      const agentDetailsLink = await renderResult.findByTestId('agentDetailsLink');
      expect(agentDetailsLink.getAttribute('href')).toEqual(`/app/fleet#/fleet/agents/${agentId}`);
    });
  });
});
