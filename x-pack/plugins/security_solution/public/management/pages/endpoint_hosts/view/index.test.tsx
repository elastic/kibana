/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointList } from './index';
import '../../../../common/mock/match_media';

import { createUseUiSetting$Mock } from '../../../../../public/common/lib/kibana/kibana_react.mock';

import {
  mockEndpointDetailsApiResult,
  mockEndpointResultList,
  setEndpointListApiMockImplementation,
} from '../store/mock_endpoint_result_list';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import {
  ActivityLog,
  HostInfo,
  HostPolicyResponse,
  HostPolicyResponseActionStatus,
  HostPolicyResponseAppliedAction,
  HostStatus,
} from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { POLICY_STATUS_TO_HEALTH_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import { mockPolicyResultList } from '../../policy/store/test_mock_utils';
import { getEndpointDetailsPath } from '../../../common/routing';
import { KibanaServices, useKibana, useToasts, useUiSetting$ } from '../../../../common/lib/kibana';
import { hostIsolationHttpMocks } from '../../../../common/lib/endpoint_isolation/mocks';
import {
  createFailedResourceState,
  createLoadedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
  isUninitialisedResourceState,
} from '../../../state';
import { getCurrentIsolationRequestState } from '../store/selectors';
import { licenseService } from '../../../../common/hooks/use_license';
import { FleetActionGenerator } from '../../../../../common/endpoint/data_generators/fleet_action_generator';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  APP_PATH,
  MANAGEMENT_PATH,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
  TRANSFORM_STATES,
} from '../../../../../common/constants';
import { TransformStats } from '../types';
import {
  HOST_METADATA_LIST_ROUTE,
  metadataTransformPrefix,
  METADATA_UNITED_TRANSFORM,
} from '../../../../../common/endpoint/constants';

// not sure why this can't be imported from '../../../../common/mock/formatted_relative';
// but sure enough it needs to be inline in this one file
jest.mock('@kbn/i18n-react', () => {
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
jest.mock('../../../../common/components/link_to');
jest.mock('../../policy/store/services/ingest', () => {
  const originalModule = jest.requireActual('../../policy/store/services/ingest');
  return {
    ...originalModule,
    sendGetEndpointSecurityPackage: () => Promise.resolve({}),
  };
});
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const timepickerRanges = [
  {
    from: 'now/d',
    to: 'now/d',
    display: 'Today',
  },
  {
    from: 'now/w',
    to: 'now/w',
    display: 'This week',
  },
  {
    from: 'now-15m',
    to: 'now',
    display: 'Last 15 minutes',
  },
  {
    from: 'now-30m',
    to: 'now',
    display: 'Last 30 minutes',
  },
  {
    from: 'now-1h',
    to: 'now',
    display: 'Last 1 hour',
  },
  {
    from: 'now-24h',
    to: 'now',
    display: 'Last 24 hours',
  },
  {
    from: 'now-7d',
    to: 'now',
    display: 'Last 7 days',
  },
  {
    from: 'now-30d',
    to: 'now',
    display: 'Last 30 days',
  },
  {
    from: 'now-90d',
    to: 'now',
    display: 'Last 90 days',
  },
  {
    from: 'now-1y',
    to: 'now',
    display: 'Last 1 year',
  },
];

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_license');

// FLAKY: https://github.com/elastic/kibana/issues/115489
describe.skip('when on the endpoint list page', () => {
  const docGenerator = new EndpointDocGenerator();
  const { act, screen, fireEvent, waitFor } = reactTestingLibrary;

  let render: () => ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let abortSpy: jest.SpyInstance;

  (licenseService as jest.Mocked<typeof licenseService>).isPlatinumPlus.mockReturnValue(true);

  beforeAll(() => {
    const mockAbort = new AbortController();
    mockAbort.abort();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => mockAbort);
  });

  afterAll(() => {
    abortSpy.mockRestore();
  });

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store, coreStart, middlewareSpy } = mockedContext);
    render = () => mockedContext.render(<EndpointList />);
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/endpoints`);
    });

    // Because `.../common/lib/kibana` was mocked, we need to alter these hooks (which are jest.MockFunctions)
    // to use services that we have in our test `mockedContext`
    (useToasts as jest.Mock).mockReturnValue(coreStart.notifications.toasts);
    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });
  });

  it('should NOT display timeline', async () => {
    setEndpointListApiMockImplementation(coreStart.http, {
      endpointsResults: [],
    });

    const renderResult = render();
    const timelineFlyout = renderResult.queryByTestId('flyoutOverlay');
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
          endpointsResults: mockedEndpointListData.data,
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
          endpointsResults: mockedEndpointListData.data,
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
          endpointsResults: mockedEndpointListData.data,
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
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
      });

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
      let firstPolicyRev: number;

      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const mockedEndpointData = mockEndpointResultList({ total: 5 });
          const hostListData = mockedEndpointData.data;

          firstPolicyID = hostListData[0].metadata.Endpoint.policy.applied.id;
          firstPolicyRev = hostListData[0].metadata.Endpoint.policy.applied.endpoint_policy_version;

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
            { status: HostStatus.UNHEALTHY, policy: (p: Policy) => p },
            {
              status: HostStatus.HEALTHY,
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
              status: HostStatus.UPDATING,
              policy: (p: Policy) => {
                p.agent.configured.revision += 1; // agent policy change, not propagated to agent yet
                return p;
              },
            },
            {
              status: HostStatus.INACTIVE,
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
        expect(rows).toHaveLength(6);
      });
      it('should show total', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const total = await renderResult.findByTestId('endpointListTableTotal');
        expect(total.textContent).toEqual('Showing 5 endpoints');
      });
      it('should display correct status', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const hostStatuses = await renderResult.findAllByTestId('rowHostStatus');

        expect(hostStatuses[0].textContent).toEqual('Unhealthy');
        expect(hostStatuses[0].getAttribute('style')).toMatch(
          /background-color\: rgb\(241\, 216\, 111\)\;/
        );

        expect(hostStatuses[1].textContent).toEqual('Healthy');
        expect(hostStatuses[1].getAttribute('style')).toMatch(
          /background-color\: rgb\(109\, 204\, 177\)\;/
        );

        expect(hostStatuses[2].textContent).toEqual('Offline');
        expect(hostStatuses[2].getAttribute('style')).toMatch(
          /background-color\: rgb\(211\, 218\, 230\)\;/
        );

        expect(hostStatuses[3].textContent).toEqual('Updating');
        expect(hostStatuses[3].getAttribute('style')).toMatch(
          /background-color\: rgb\(121\, 170\, 217\)\;/
        );

        expect(hostStatuses[4].textContent).toEqual('Inactive');
        expect(hostStatuses[4].getAttribute('style')).toMatch(
          /background-color\: rgb\(211\, 218\, 230\)\;/
        );
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
        expect(outOfDates).toHaveLength(4);

        outOfDates.forEach((item) => {
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
        expect(firstPolicyName.getAttribute('href')).toEqual(
          `${APP_PATH}${MANAGEMENT_PATH}/policy/${firstPolicyID}/settings`
        );
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

      it('should show revision number', async () => {
        const renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const firstPolicyRevElement = (await renderResult.findAllByTestId('policyListRevNo'))[0];
        expect(firstPolicyRevElement).not.toBeNull();
        expect(firstPolicyRevElement.textContent).toEqual(`rev. ${firstPolicyRev}`);
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/75721
  describe.skip('when polling on Endpoint List', () => {
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        const hostListData = mockEndpointResultList({ total: 4 }).data;

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
        endpointsResults: mockEndpointResultList({ total: 1 }).data,
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
    let renderAndWaitForData: () => Promise<ReturnType<AppContextTestRender['render']>>;
    const mockEndpointListApi = (mockedPolicyResponse?: HostPolicyResponse) => {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        host_status,
        metadata: { agent, Endpoint, ...details },
      } = mockEndpointDetailsApiResult();

      hostDetails = {
        host_status,
        metadata: {
          ...details,
          Endpoint: {
            ...Endpoint,
            state: {
              ...Endpoint.state,
              isolation: false,
            },
          },
          agent: {
            ...agent,
            id: '1',
          },
        },
      };

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

    const dispatchEndpointDetailsActivityLogChanged = (
      dataState: 'failed' | 'success',
      data: ActivityLog
    ) => {
      reactTestingLibrary.act(() => {
        const getPayload = () => {
          switch (dataState) {
            case 'failed':
              return createFailedResourceState({
                statusCode: 500,
                error: 'Internal Server Error',
                message: 'An internal server error occurred.',
              });
            case 'success':
              return createLoadedResourceState(data);
          }
        };
        store.dispatch({
          type: 'endpointDetailsActivityLogChanged',
          payload: getPayload(),
        });
      });
    };

    beforeEach(async () => {
      mockEndpointListApi();

      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints?selected_endpoint=1`);
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

    it('should show the flyout and footer', async () => {
      const renderResult = await renderAndWaitForData();
      expect(renderResult.getByTestId('endpointDetailsFlyout')).not.toBeNull();
      expect(renderResult.getByTestId('endpointDetailsFlyoutFooter')).not.toBeNull();
    });

    it('should display policy name value as a link', async () => {
      const renderResult = await renderAndWaitForData();
      const policyDetailsLink = await renderResult.findByTestId('policyDetailsValue');
      expect(policyDetailsLink).not.toBeNull();
      expect(policyDetailsLink.getAttribute('href')).toEqual(
        `${APP_PATH}${MANAGEMENT_PATH}/policy/${hostDetails.metadata.Endpoint.policy.applied.id}/settings`
      );
    });

    it('should display policy revision number', async () => {
      const renderResult = await renderAndWaitForData();
      const policyDetailsRevElement = await renderResult.findByTestId('policyDetailsRevNo');
      expect(policyDetailsRevElement).not.toBeNull();
      expect(policyDetailsRevElement.textContent).toEqual(
        `rev. ${hostDetails.metadata.Endpoint.policy.applied.endpoint_policy_version}`
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
        `${MANAGEMENT_PATH}/policy/${hostDetails.metadata.Endpoint.policy.applied.id}/settings`
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
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(renderResult.getByTestId('policyStatusValue-success')).toBeTruthy();
      expect(policyStatusBadge.textContent).toEqual('Success');
    });

    it('should display Warning overall policy status', async () => {
      mockEndpointListApi(createPolicyResponse(HostPolicyResponseActionStatus.warning));
      const renderResult = await renderAndWaitForData();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusBadge.textContent).toEqual('Warning');
      expect(renderResult.getByTestId('policyStatusValue-warning')).toBeTruthy();
    });

    it('should display Failed overall policy status', async () => {
      mockEndpointListApi(createPolicyResponse(HostPolicyResponseActionStatus.failure));
      const renderResult = await renderAndWaitForData();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusBadge.textContent).toEqual('Failed');
      expect(renderResult.getByTestId('policyStatusValue-failure')).toBeTruthy();
    });

    it('should display Unknown overall policy status', async () => {
      mockEndpointListApi(createPolicyResponse('' as HostPolicyResponseActionStatus));
      const renderResult = await renderAndWaitForData();
      const policyStatusBadge = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusBadge.textContent).toEqual('Unknown');
      expect(renderResult.getByTestId('policyStatusValue-')).toBeTruthy();
    });

    it('should show the Take Action button', async () => {
      const renderResult = await renderAndWaitForData();
      expect(renderResult.getByTestId('endpointDetailsActionsButton')).not.toBeNull();
    });

    describe('when showing Activity Log panel', () => {
      let renderResult: ReturnType<typeof render>;
      const agentId = 'some_agent_id';

      let getMockData: (option?: { hasLogsEndpointActionResponses?: boolean }) => ActivityLog;
      beforeEach(async () => {
        window.IntersectionObserver = jest.fn(() => ({
          root: null,
          rootMargin: '',
          thresholds: [],
          takeRecords: jest.fn(),
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        }));

        mockUseUiSetting$.mockImplementation((key, defaultValue) => {
          const useUiSetting$Mock = createUseUiSetting$Mock();

          return key === DEFAULT_TIMEPICKER_QUICK_RANGES
            ? [timepickerRanges, jest.fn()]
            : useUiSetting$Mock(key, defaultValue);
        });

        const fleetActionGenerator = new FleetActionGenerator('seed');
        const endpointActionGenerator = new EndpointActionGenerator('seed');
        const endpointResponseData = endpointActionGenerator.generateResponse({
          agent: { id: agentId },
        });
        const fleetResponseData = fleetActionGenerator.generateResponse({
          agent_id: agentId,
        });

        const fleetActionData = fleetActionGenerator.generate({
          agents: [agentId],
          data: {
            comment: 'some comment',
          },
        });
        const isolatedActionData = fleetActionGenerator.generateIsolateAction({
          agents: [agentId],
          data: {
            comment: ' ', // has space for comment,
          },
        });

        getMockData = (hasLogsEndpointActionResponses?: {
          hasLogsEndpointActionResponses?: boolean;
        }) => {
          const response: ActivityLog = {
            page: 1,
            pageSize: 50,
            startDate: 'now-1d',
            endDate: 'now',
            data: [
              {
                type: 'fleetResponse',
                item: {
                  id: 'some_id_1',
                  data: fleetResponseData,
                },
              },
              {
                type: 'fleetAction',
                item: {
                  id: 'some_id_2',
                  data: fleetActionData,
                },
              },
              {
                type: 'fleetAction',
                item: {
                  id: 'some_id_3',
                  data: isolatedActionData,
                },
              },
            ],
          };
          if (hasLogsEndpointActionResponses) {
            response.data.unshift({
              type: 'response',
              item: {
                id: 'some_id_0',
                data: endpointResponseData,
              },
            });
          }
          return response;
        };

        renderResult = render();
        await reactTestingLibrary.act(async () => {
          await middlewareSpy.waitForAction('serverReturnedEndpointList');
        });
        const hostNameLinks = renderResult.getAllByTestId('hostnameCellLink');
        userEvent.click(hostNameLinks[0]);
      });

      afterEach(reactTestingLibrary.cleanup);

      it('should show the endpoint details flyout', async () => {
        const activityLogTab = await renderResult.findByTestId('activity_log');
        userEvent.click(activityLogTab);
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', getMockData());
        });
        const endpointDetailsFlyout = renderResult.queryByTestId('endpointDetailsFlyoutBody');
        expect(endpointDetailsFlyout).not.toBeNull();
      });

      it('should display log accurately', async () => {
        const activityLogTab = await renderResult.findByTestId('activity_log');
        userEvent.click(activityLogTab);
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', getMockData());
        });
        const logEntries = renderResult.queryAllByTestId('timelineEntry');
        expect(logEntries.length).toEqual(3);
        expect(`${logEntries[0]} .euiCommentTimeline__icon--update`).not.toBe(null);
        expect(`${logEntries[1]} .euiCommentTimeline__icon--regular`).not.toBe(null);
      });

      it('should display log accurately with endpoint responses', async () => {
        const activityLogTab = await renderResult.findByTestId('activity_log');
        userEvent.click(activityLogTab);
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged(
            'success',
            getMockData({ hasLogsEndpointActionResponses: true })
          );
        });
        const logEntries = renderResult.queryAllByTestId('timelineEntry');
        expect(logEntries.length).toEqual(4);
        expect(`${logEntries[0]} .euiCommentTimeline__icon--update`).not.toBe(null);
        expect(`${logEntries[1]} .euiCommentTimeline__icon--update`).not.toBe(null);
        expect(`${logEntries[2]} .euiCommentTimeline__icon--regular`).not.toBe(null);
      });

      it('should display empty state when API call has failed', async () => {
        const activityLogTab = await renderResult.findByTestId('activity_log');
        userEvent.click(activityLogTab);
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('failed', getMockData());
        });
        const emptyState = renderResult.queryByTestId('activityLogEmpty');
        expect(emptyState).not.toBe(null);
      });

      it('should not display empty state when no log data', async () => {
        const activityLogTab = await renderResult.findByTestId('activity_log');
        userEvent.click(activityLogTab);
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', {
            page: 1,
            pageSize: 50,
            startDate: 'now-1d',
            endDate: 'now',
            data: [],
          });
        });

        const emptyState = renderResult.queryByTestId('activityLogEmpty');
        expect(emptyState).toBe(null);

        const superDatePicker = renderResult.queryByTestId('activityLogSuperDatePicker');
        expect(superDatePicker).not.toBe(null);
      });

      it('should display activity log when tab is loaded using the URL', async () => {
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          history.push(
            getEndpointDetailsPath({
              page_index: '0',
              page_size: '10',
              name: 'endpointActivityLog',
              selected_endpoint: '1',
            })
          );
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1&show=activity_log'
        );
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', getMockData());
        });
        const logEntries = renderResult.queryAllByTestId('timelineEntry');
        expect(logEntries.length).toEqual(3);
      });

      it('should display a callout message if no log data', async () => {
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          history.push(
            getEndpointDetailsPath({
              page_index: '0',
              page_size: '10',
              name: 'endpointActivityLog',
              selected_endpoint: '1',
            })
          );
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1&show=activity_log'
        );
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', {
            page: 1,
            pageSize: 50,
            startDate: 'now-1d',
            endDate: 'now',
            data: [],
          });
        });

        const activityLogCallout = await renderResult.findByTestId('activityLogNoDataCallout');
        expect(activityLogCallout).not.toBeNull();
      });

      it('should display a callout message if no log data also on refetch', async () => {
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          history.push(
            getEndpointDetailsPath({
              page_index: '0',
              page_size: '10',
              name: 'endpointActivityLog',
              selected_endpoint: '1',
            })
          );
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1&show=activity_log'
        );
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', {
            page: 1,
            pageSize: 50,
            startDate: 'now-1d',
            endDate: 'now',
            data: [],
          });
        });

        const activityLogCallout = await renderResult.findByTestId('activityLogNoDataCallout');
        expect(activityLogCallout).not.toBeNull();

        // click refresh button
        const refreshLogButton = await renderResult.findByTestId('superDatePickerApplyTimeButton');
        userEvent.click(refreshLogButton);

        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', {
            page: 1,
            pageSize: 50,
            startDate: 'now-1d',
            endDate: 'now',
            data: [],
          });
        });

        const activityLogNoDataCallout = await renderResult.findByTestId(
          'activityLogNoDataCallout'
        );
        expect(activityLogNoDataCallout).not.toBeNull();
      });

      it('should not display scroll trigger when showing callout message', async () => {
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          history.push(
            getEndpointDetailsPath({
              page_index: '0',
              page_size: '10',
              name: 'endpointActivityLog',
              selected_endpoint: '1',
            })
          );
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1&show=activity_log'
        );
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', {
            page: 1,
            pageSize: 50,
            startDate: 'now-1d',
            endDate: 'now',
            data: [],
          });
        });

        const activityLogCallout = await renderResult.findByTestId('activityLogNoDataCallout');
        expect(activityLogCallout).not.toBeNull();
        // scroll to the bottom by pressing down arrow key
        // and keep it pressed
        userEvent.keyboard('ArrowDown>');
        // end scrolling after 1s
        await waitFor(() => {});
        userEvent.keyboard('/ArrowDown');
        expect(await renderResult.queryByTestId('activityLogLoadMoreTrigger')).toBeNull();
      });

      it('should correctly display non-empty comments only for actions', async () => {
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          history.push(
            getEndpointDetailsPath({
              page_index: '0',
              page_size: '10',
              name: 'endpointActivityLog',
              selected_endpoint: '1',
            })
          );
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_endpoint=1&show=activity_log'
        );
        await middlewareSpy.waitForAction('endpointDetailsActivityLogChanged');
        reactTestingLibrary.act(() => {
          dispatchEndpointDetailsActivityLogChanged('success', getMockData());
        });
        const commentTexts = renderResult.queryAllByTestId('activityLogCommentText');
        expect(commentTexts.length).toEqual(1);
        expect(commentTexts[0].textContent).toEqual('some comment');
        expect(commentTexts[0].parentElement?.parentElement?.className).toContain(
          'euiCommentEvent--regular'
        );
      });
    });

    describe('when showing host Policy Response panel', () => {
      let renderResult: ReturnType<typeof render>;
      beforeEach(async () => {
        coreStart.http.post.mockImplementation(async (requestOptions) => {
          if (requestOptions.path === HOST_METADATA_LIST_ROUTE) {
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
        const endpointDetailsFlyout = renderResult.queryByTestId('endpointDetailsFlyoutBody');
        expect(endpointDetailsFlyout).toBeNull();
      });

      it('should display policy response sub-panel', async () => {
        expect(await renderResult.findByTestId('flyoutSubHeaderBackButton')).not.toBeNull();
        expect(
          await renderResult.findByTestId('endpointDetailsPolicyResponseFlyoutBody')
        ).not.toBeNull();
      });

      it('should include the sub-panel title', async () => {
        expect(
          (await renderResult.findByTestId('endpointDetailsPolicyResponseFlyoutTitle')).textContent
        ).toBe('Policy Response');
      });

      it('should display timestamp', () => {
        const timestamp = renderResult.queryByTestId('endpointDetailsPolicyResponseTimestamp');
        expect(timestamp).not.toBeNull();
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
        expect(subHeaderBackLink.textContent).toBe('Endpoint details');
        expect(subHeaderBackLink.getAttribute('href')).toEqual(
          `${APP_PATH}${MANAGEMENT_PATH}/endpoints?page_index=0&page_size=10&selected_endpoint=1&show=details`
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
          '?page_index=0&page_size=10&selected_endpoint=1&show=details'
        );
      });

      it('should format unknown policy action names', async () => {
        expect(renderResult.getByText('A New Unknown Action')).not.toBeNull();
      });
    });

    describe('when showing the Host Isolate panel', () => {
      const getKibanaServicesMock = KibanaServices.get as jest.Mock;
      const confirmIsolateAndWaitForApiResponse = async (
        typeOfResponse: 'success' | 'failure' = 'success'
      ) => {
        const isolateResponseAction = middlewareSpy.waitForAction(
          'endpointIsolationRequestStateChange',
          {
            validate(action) {
              if (typeOfResponse === 'failure') {
                return isFailedResourceState(action.payload);
              }

              return isLoadedResourceState(action.payload);
            },
          }
        );

        await act(async () => {
          fireEvent.click(renderResult.getByTestId('hostIsolateConfirmButton'));
          await isolateResponseAction;
        });
      };

      let isolateApiMock: ReturnType<typeof hostIsolationHttpMocks>;
      let renderResult: ReturnType<AppContextTestRender['render']>;

      beforeEach(async () => {
        getKibanaServicesMock.mockReturnValue(coreStart);
        reactTestingLibrary.act(() => {
          history.push(`${MANAGEMENT_PATH}/endpoints?selected_endpoint=1&show=isolate`);
        });
        renderResult = await renderAndWaitForData();
        // Need to reset `http.post` and adjust it so that the mock for http host
        // isolation api does not output error noise to the console
        coreStart.http.post.mockReset();
        coreStart.http.post.mockImplementation(async () => null);
        isolateApiMock = hostIsolationHttpMocks(coreStart.http);
      });

      it('should show the isolate form', () => {
        expect(renderResult.getByTestId('host_isolation_comment')).not.toBeNull();
      });

      it('should take you back to details when back link below the flyout header is clicked', async () => {
        const backButtonLink = renderResult.getByTestId('flyoutSubHeaderBackButton');

        expect(backButtonLink.getAttribute('href')).toEqual(
          `${APP_PATH}${getEndpointDetailsPath({
            name: 'endpointDetails',
            page_index: '0',
            page_size: '10',
            selected_endpoint: '1',
          })}`
        );

        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');

        act(() => {
          fireEvent.click(backButtonLink);
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10&selected_endpoint=1&show=details',
        });
      });

      it('take you back to details when Cancel button is clicked', async () => {
        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');

        act(() => {
          fireEvent.click(renderResult.getByTestId('hostIsolateCancelButton'));
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10&selected_endpoint=1&show=details',
        });
      });

      it('should isolate endpoint host when confirm is clicked', async () => {
        await confirmIsolateAndWaitForApiResponse();
        expect(renderResult.getByTestId('hostIsolateSuccessMessage')).not.toBeNull();
      });

      it('should navigate to details when the Complete button on success message is clicked', async () => {
        await confirmIsolateAndWaitForApiResponse();

        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');

        act(() => {
          fireEvent.click(renderResult.getByTestId('hostIsolateSuccessCompleteButton'));
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10&selected_endpoint=1&show=details',
        });
      });

      it('should show error if isolate fails', async () => {
        isolateApiMock.responseProvider.isolateHost.mockImplementation(() => {
          throw new Error('oh oh. something went wrong');
        });
        await confirmIsolateAndWaitForApiResponse('failure');

        expect(renderResult.getByText('oh oh. something went wrong')).not.toBeNull();
      });

      it('should reset isolation state and show form again', async () => {
        // ensures that after the host isolation has been successful, if user navigates away from the panel
        // (`show` is NOT `isolate`), then the state should be reset so that the form show up again the next
        // time `isolate host` is clicked
        await confirmIsolateAndWaitForApiResponse();
        expect(renderResult.getByTestId('hostIsolateSuccessMessage')).not.toBeNull();

        // Close flyout
        const changeUrlAction = middlewareSpy.waitForAction('userChangedUrl');
        act(() => {
          fireEvent.click(renderResult.getByTestId('euiFlyoutCloseButton'));
        });

        expect((await changeUrlAction).payload).toMatchObject({
          pathname: `${MANAGEMENT_PATH}/endpoints`,
          search: '?page_index=0&page_size=10',
        });

        expect(
          isUninitialisedResourceState(
            getCurrentIsolationRequestState(store.getState().management.endpoints)
          )
        ).toBe(true);
      });

      it('should NOT show the flyout footer', () => {
        expect(renderResult.queryByTestId('endpointDetailsFlyoutFooter')).toBeNull();
      });
    });
  });

  describe('when the more actions column is opened', () => {
    const generator = new EndpointDocGenerator('seed');
    let hostInfo: HostInfo;
    let agentId: string;
    let agentPolicyId: string;
    let renderResult: ReturnType<AppContextTestRender['render']>;

    const mockEndpointListApi = () => {
      const { data: hosts } = mockEndpointResultList();
      hostInfo = {
        host_status: hosts[0].host_status,
        metadata: {
          ...hosts[0].metadata,
          Endpoint: {
            ...hosts[0].metadata.Endpoint,
            state: {
              ...hosts[0].metadata.Endpoint.state,
              isolation: false,
            },
          },
          host: {
            ...hosts[0].metadata.host,
            os: {
              ...hosts[0].metadata.host.os,
              name: 'Windows',
            },
          },
          agent: {
            ...hosts[0].metadata.agent,
            version: '7.14.0',
          },
        },
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

    beforeEach(async () => {
      mockEndpointListApi();

      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints`);
      });

      renderResult = render();
      await middlewareSpy.waitForAction('serverReturnedEndpointList');
      await middlewareSpy.waitForAction('serverReturnedEndpointAgentPolicies');

      const endpointActionsButton = await renderResult.findByTestId('endpointTableRowActions');

      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to the Host Details Isolate flyout', async () => {
      const isolateLink = await renderResult.findByTestId('isolateLink');
      expect(isolateLink.getAttribute('href')).toEqual(
        `${APP_PATH}${getEndpointDetailsPath({
          name: 'endpointIsolate',
          page_index: '0',
          page_size: '10',
          selected_endpoint: hostInfo.metadata.agent.id,
        })}`
      );
    });

    it('navigates to the Security Solution Host Details page', async () => {
      const hostLink = await renderResult.findByTestId('hostLink');
      expect(hostLink.getAttribute('href')).toEqual(
        `${APP_PATH}/hosts/${hostInfo.metadata.host.hostname}`
      );
    });
    it('navigates to the Ingest Agent Policy page', async () => {
      const agentPolicyLink = await renderResult.findByTestId('agentPolicyLink');
      expect(agentPolicyLink.getAttribute('href')).toEqual(`/app/fleet/policies/${agentPolicyId}`);
    });
    it('navigates to the Ingest Agent Details page', async () => {
      const agentDetailsLink = await renderResult.findByTestId('agentDetailsLink');
      expect(agentDetailsLink.getAttribute('href')).toEqual(`/app/fleet/agents/${agentId}`);
    });

    it('navigates to the Ingest Agent Details page with policy reassign', async () => {
      const agentPolicyReassignLink = await renderResult.findByTestId('agentPolicyReassignLink');
      expect(agentPolicyReassignLink.getAttribute('href')).toEqual(
        `/app/fleet/agents/${agentId}?openReassignFlyout=true`
      );
    });
  });

  describe('required transform failed banner', () => {
    it('is not displayed when transform state is not failed', () => {
      const transforms: TransformStats[] = [
        {
          id: `${metadataTransformPrefix}-0.20.0`,
          state: TRANSFORM_STATES.STARTED,
        } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = screen.queryByTestId('callout-endpoints-list-transform-failed');
      expect(banner).toBeNull();
    });

    it('is not displayed when non-relevant transform is failing', () => {
      const transforms: TransformStats[] = [
        { id: 'not-metadata', state: TRANSFORM_STATES.FAILED } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = screen.queryByTestId('callout-endpoints-list-transform-failed');
      expect(banner).toBeNull();
    });

    it('is not displayed when no endpoint policy', () => {
      const transforms: TransformStats[] = [
        { id: 'not-metadata', state: TRANSFORM_STATES.FAILED } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: [],
      });
      render();
      const banner = screen.queryByTestId('callout-endpoints-list-transform-failed');
      expect(banner).toBeNull();
    });

    it('is displayed when relevant transform state is failed state', async () => {
      const transforms: TransformStats[] = [
        {
          id: `${metadataTransformPrefix}-0.20.0`,
          state: TRANSFORM_STATES.FAILED,
        } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = await screen.findByTestId('callout-endpoints-list-transform-failed');
      expect(banner).toBeInTheDocument();
    });

    it('displays correct transform id when in failed state', async () => {
      const transforms: TransformStats[] = [
        {
          id: `${metadataTransformPrefix}-0.20.0`,
          state: TRANSFORM_STATES.STARTED,
        } as TransformStats,
        {
          id: `${METADATA_UNITED_TRANSFORM}-1.2.1`,
          state: TRANSFORM_STATES.FAILED,
        } as TransformStats,
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        transforms,
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
      render();
      const banner = await screen.findByTestId('callout-endpoints-list-transform-failed');
      expect(banner).not.toHaveTextContent(transforms[0].id);
      expect(banner).toHaveTextContent(transforms[1].id);
    });
  });
});
