/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointList } from '.';
import '../../../../common/mock/match_media';
import { createUseUiSetting$Mock } from '../../../../common/lib/kibana/kibana_react.mock';

import {
  mockEndpointDetailsApiResult,
  mockEndpointResultList,
  setEndpointListApiMockImplementation,
} from '../store/mock_endpoint_result_list';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import type {
  HostInfo,
  HostPolicyResponse,
  HostPolicyResponseAppliedAction,
} from '../../../../../common/endpoint/types';
import { HostPolicyResponseActionStatus, HostStatus } from '../../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { POLICY_STATUS_TO_HEALTH_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import { mockPolicyResultList } from '../../policy/store/test_mock_utils';
import { getEndpointDetailsPath } from '../../../common/routing';
import { KibanaServices, useKibana, useToasts, useUiSetting$ } from '../../../../common/lib/kibana';
import { hostIsolationHttpMocks } from '../../../../common/lib/endpoint_isolation/mocks';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isUninitialisedResourceState,
} from '../../../state';
import { getCurrentIsolationRequestState } from '../store/selectors';
import { licenseService } from '../../../../common/hooks/use_license';

import {
  APP_PATH,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
  MANAGEMENT_PATH,
  TRANSFORM_STATES,
} from '../../../../../common/constants';
import type { TransformStats } from '../types';
import {
  HOST_METADATA_LIST_ROUTE,
  metadataTransformPrefix,
  METADATA_UNITED_TRANSFORM,
} from '../../../../../common/endpoint/constants';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  initialUserPrivilegesState,
  initialUserPrivilegesState as mockInitialUserPrivilegesState,
} from '../../../../common/components/user_privileges/user_privileges_context';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { ENDPOINT_CAPABILITIES } from '../../../../../common/endpoint/service/response_actions/constants';
import { getEndpointPrivilegesInitialStateMock } from '../../../../common/components/user_privileges/endpoint/mocks';

const mockUserPrivileges = useUserPrivileges as jest.Mock;
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
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/components/link_to');
jest.mock('../../../services/policies/ingest', () => {
  const originalModule = jest.requireActual('../../../services/policies/ingest');
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

describe('when on the endpoint list page', () => {
  const docGenerator = new EndpointDocGenerator();
  const { act, screen, fireEvent } = reactTestingLibrary;

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

  describe('when there is no selected host in the url', () => {
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

        it('should show the flyout', async () => {
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

    beforeEach(async () => {
      mockEndpointListApi();
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());

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
      mockUserPrivileges.mockReset();
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

    describe('Activity Log tab', () => {
      beforeEach(() => {
        mockUseUiSetting$.mockImplementation((key, defaultValue) => {
          const useUiSetting$Mock = createUseUiSetting$Mock();

          return key === DEFAULT_TIMEPICKER_QUICK_RANGES
            ? [timepickerRanges, jest.fn()]
            : useUiSetting$Mock(key, defaultValue);
        });
      });

      afterEach(() => {
        reactTestingLibrary.cleanup();
      });

      describe('when `canReadActionsLogManagement` is TRUE', () => {
        it('should start with the activity log tab as unselected', async () => {
          const renderResult = await renderAndWaitForData();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.getByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          expect(detailsTab).toHaveAttribute('aria-selected', 'true');
          expect(activityLogTab).toHaveAttribute('aria-selected', 'false');
          expect(renderResult.getByTestId('endpointDetailsFlyoutBody')).not.toBeNull();
          expect(renderResult.queryByTestId('endpointActivityLogFlyoutBody')).toBeNull();
        });

        it('should show the activity log content when selected', async () => {
          const renderResult = await renderAndWaitForData();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.getByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          userEvent.click(activityLogTab);
          expect(detailsTab).toHaveAttribute('aria-selected', 'false');
          expect(activityLogTab).toHaveAttribute('aria-selected', 'true');
          expect(renderResult.getByTestId('endpointActivityLogFlyoutBody')).not.toBeNull();
          expect(renderResult.queryByTestId('endpointDetailsFlyoutBody')).toBeNull();
        });
      });

      describe('when `canReadActionsLogManagement` is FALSE', () => {
        it('should not show the response actions history tab', async () => {
          mockUserPrivileges.mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: {
              ...mockInitialUserPrivilegesState().endpointPrivileges,
              canReadActionsLogManagement: false,
              canReadEndpointList: true,
              canAccessFleet: true,
            },
          });
          const renderResult = await renderAndWaitForData();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.queryByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          expect(detailsTab).toHaveAttribute('aria-selected', 'true');
          expect(activityLogTab).toBeNull();
          expect(renderResult.findByTestId('endpointDetailsFlyoutBody')).not.toBeNull();
        });

        it('should show the overview tab when force loading actions history tab via URL', async () => {
          mockUserPrivileges.mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: {
              ...mockInitialUserPrivilegesState().endpointPrivileges,
              canReadActionsLogManagement: false,
              canReadEndpointList: true,
              canAccessFleet: true,
            },
          });
          reactTestingLibrary.act(() => {
            history.push(`${MANAGEMENT_PATH}/endpoints?selected_endpoint=1&show=activity_log`);
          });

          const renderResult = await renderAndWaitForData();
          const detailsTab = renderResult.getByTestId('endpoint-details-flyout-tab-details');
          const activityLogTab = renderResult.queryByTestId(
            'endpoint-details-flyout-tab-activity_log'
          );

          expect(detailsTab).toHaveAttribute('aria-selected', 'true');
          expect(activityLogTab).toBeNull();
          expect(renderResult.findByTestId('endpointDetailsFlyoutBody')).not.toBeNull();
        });
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
    let hostInfo: HostInfo[];
    let agentId: string;
    let agentPolicyId: string;
    let renderResult: ReturnType<AppContextTestRender['render']>;
    let endpointActionsButton: HTMLElement;

    // 2nd endpoint only has isolation capabilities
    const mockEndpointListApi = () => {
      const { data: hosts } = mockEndpointResultList({ total: 2 });
      hostInfo = [
        {
          host_status: hosts[0].host_status,
          metadata: {
            ...hosts[0].metadata,
            Endpoint: {
              ...hosts[0].metadata.Endpoint,
              capabilities: [...ENDPOINT_CAPABILITIES],
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
        },
        {
          host_status: hosts[1].host_status,
          metadata: {
            ...hosts[1].metadata,
            Endpoint: {
              ...hosts[1].metadata.Endpoint,
              capabilities: ['isolation'],
              state: {
                ...hosts[1].metadata.Endpoint.state,
                isolation: false,
              },
            },
            host: {
              ...hosts[1].metadata.host,
              os: {
                ...hosts[1].metadata.host.os,
                name: 'Windows',
              },
            },
            agent: {
              ...hosts[1].metadata.agent,
              version: '8.4.0',
            },
          },
        },
      ];

      const packagePolicy = docGenerator.generatePolicyPackagePolicy();
      packagePolicy.id = hosts[0].metadata.Endpoint.policy.applied.id;

      const agentPolicy = generator.generateAgentPolicy();
      agentPolicyId = agentPolicy.id;
      agentId = hosts[0].metadata.elastic.agent.id;
      packagePolicy.policy_id = agentPolicyId;

      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: hostInfo,
        endpointPackagePolicies: [packagePolicy],
        agentPolicy,
      });
    };

    beforeEach(async () => {
      mockEndpointListApi();
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());

      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints`);
      });

      renderResult = render();
      await middlewareSpy.waitForAction('serverReturnedEndpointList');
      await middlewareSpy.waitForAction('serverReturnedEndpointAgentPolicies');

      endpointActionsButton = (await renderResult.findAllByTestId('endpointTableRowActions'))[0];

      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });

    it('shows the Responder option when all 3 processes capabilities are present in the endpoint', async () => {
      const responderButton = await renderResult.findByTestId('console');
      expect(responderButton).not.toHaveAttribute('disabled');
    });

    it('navigates to the Response actions history flyout', async () => {
      const actionsLink = await renderResult.findByTestId('actionsLink');

      expect(actionsLink.getAttribute('href')).toEqual(
        `${APP_PATH}${getEndpointDetailsPath({
          name: 'endpointActivityLog',
          page_index: '0',
          page_size: '10',
          selected_endpoint: hostInfo[0].metadata.agent.id,
        })}`
      );
    });

    it('navigates to the Host Details Isolate flyout', async () => {
      const isolateLink = await renderResult.findByTestId('isolateLink');
      expect(isolateLink.getAttribute('href')).toEqual(
        `${APP_PATH}${getEndpointDetailsPath({
          name: 'endpointIsolate',
          page_index: '0',
          page_size: '10',
          selected_endpoint: hostInfo[0].metadata.agent.id,
        })}`
      );
    });

    it('hides isolate host option if canIsolateHost is false', () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canIsolateHost: false,
        },
      });
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
      const isolateLink = screen.queryByTestId('isolateLink');
      expect(isolateLink).toBeNull();
    });

    it('navigates to the Security Solution Host Details page', async () => {
      const hostLink = await renderResult.findByTestId('hostLink');
      expect(hostLink.getAttribute('href')).toEqual(
        `${APP_PATH}/hosts/${hostInfo[0].metadata.host.hostname}`
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
    beforeEach(() => {
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });
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
  describe('endpoint list onboarding screens with RBAC', () => {
    beforeEach(() => {
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: [],
        endpointPackagePolicies: mockPolicyResultList({ total: 3 }).items,
      });
    });
    afterEach(() => {
      mockUserPrivileges.mockReset();
    });
    it('user has endpoint list ALL and fleet All and can view entire onboarding screen', async () => {
      mockUserPrivileges.mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canWriteEndpointList: true,
          canAccessFleet: true,
        }),
      });
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
      expect(onboardingSteps).not.toBeNull();
    });
    it('user has endpoint list READ and fleet All and can view entire onboarding screen', async () => {
      mockUserPrivileges.mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadEndpointList: true,
          canAccessFleet: true,
        }),
      });
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
      expect(onboardingSteps).not.toBeNull();
    });
    it('user has endpoint list ALL/READ and fleet NONE and can view a modified onboarding screen with no actions link to fleet', async () => {
      mockUserPrivileges.mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadEndpointList: true,
          canAccessFleet: false,
        }),
      });
      const renderResult = render();
      await reactTestingLibrary.act(async () => {
        await middlewareSpy.waitForAction('serverReturnedPoliciesForOnboarding');
      });
      const onboardingSteps = await renderResult.findByTestId('policyOnboardingInstructions');
      expect(onboardingSteps).not.toBeNull();
      const noPrivilegesPage = await renderResult.findByTestId('noFleetAccess');
      expect(noPrivilegesPage).not.toBeNull();
      const startButton = renderResult.queryByTestId('onboardingStartButton');
      expect(startButton).toBeNull();
    });
  });
  describe('endpoint list take action with RBAC controls', () => {
    let renderResult: ReturnType<AppContextTestRender['render']>;

    const renderAndClickActionsButton = async (tableRow: number = 0) => {
      reactTestingLibrary.act(() => {
        history.push(`${MANAGEMENT_PATH}/endpoints`);
      });

      renderResult = render();
      await middlewareSpy.waitForAction('serverReturnedEndpointList');
      await middlewareSpy.waitForAction('serverReturnedEndpointAgentPolicies');

      const endpointActionsButton: HTMLElement = (
        await renderResult.findAllByTestId('endpointTableRowActions')
      )[tableRow];

      reactTestingLibrary.act(() => {
        reactTestingLibrary.fireEvent.click(endpointActionsButton);
      });
    };

    beforeEach(async () => {
      const { data: hosts } = mockEndpointResultList({ total: 2 });
      // second host is isolated, for unisolate testing
      const hostInfo: HostInfo[] = [
        {
          host_status: hosts[0].host_status,
          metadata: {
            ...hosts[0].metadata,
            Endpoint: {
              ...hosts[0].metadata.Endpoint,
              capabilities: [...ENDPOINT_CAPABILITIES],
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
        },
        {
          host_status: hosts[1].host_status,
          metadata: {
            ...hosts[1].metadata,
            Endpoint: {
              ...hosts[1].metadata.Endpoint,
              capabilities: ['isolation'],
              state: {
                ...hosts[1].metadata.Endpoint.state,
                isolation: true,
              },
            },
            host: {
              ...hosts[1].metadata.host,
              os: {
                ...hosts[1].metadata.host.os,
                name: 'Windows',
              },
            },
            agent: {
              ...hosts[1].metadata.agent,
              version: '8.4.0',
            },
          },
        },
      ];
      setEndpointListApiMockImplementation(coreStart.http, {
        endpointsResults: hostInfo,
        endpointPackagePolicies: mockPolicyResultList({ total: 2 }).items,
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
      mockUserPrivileges.mockReset();
    });
    it('shows Isolate host option if canHostIsolate is READ/ALL', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canIsolateHost: true,
        },
      });
      await renderAndClickActionsButton();
      const isolateLink = await renderResult.findByTestId('isolateLink');
      expect(isolateLink).not.toBeNull();
    });
    it('hides Isolate host option if canIsolateHost is NONE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canIsolateHost: false,
        },
      });
      await renderAndClickActionsButton();
      const isolateLink = screen.queryByTestId('isolateLink');
      expect(isolateLink).toBeNull();
    });
    it('shows unisolate host option if canUnHostIsolate is READ/ALL', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canUnIsolateHost: true,
        },
      });
      await renderAndClickActionsButton(1);
      const unisolateLink = await renderResult.findByTestId('unIsolateLink');
      expect(unisolateLink).not.toBeNull();
    });
    it('hides unisolate host option if canUnIsolateHost is NONE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canUnIsolateHost: false,
        },
      });
      await renderAndClickActionsButton(1);
      const unisolateLink = renderResult.queryByTestId('unIsolateLink');
      expect(unisolateLink).toBeNull();
    });

    it('shows the Responder option when at least one rbac privilege from host isolation, process operation and file operation, is set to TRUE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessResponseConsole: true,
        },
      });
      await renderAndClickActionsButton();
      const responderButton = await renderResult.findByTestId('console');
      expect(responderButton).not.toBeNull();
    });

    it('hides the Responder option when host isolation, process operation and file operations are ALL set to NONE', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessResponseConsole: false,
        },
      });
      await renderAndClickActionsButton();
      const responderButton = renderResult.queryByTestId('console');
      expect(responderButton).toBeNull();
    });
    it('always shows the Host details link', async () => {
      mockUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());
      await renderAndClickActionsButton();
      const hostLink = await renderResult.findByTestId('hostLink');
      expect(hostLink).not.toBeNull();
    });
    it('shows Agent Policy, View Agent Details and Reassign Policy Links when canAccessFleet RBAC control is enabled', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessFleet: true,
        },
      });
      await renderAndClickActionsButton();
      const agentPolicyLink = await renderResult.findByTestId('agentPolicyLink');
      const agentDetailsLink = await renderResult.findByTestId('agentDetailsLink');
      const agentPolicyReassignLink = await renderResult.findByTestId('agentPolicyReassignLink');
      expect(agentPolicyLink).not.toBeNull();
      expect(agentDetailsLink).not.toBeNull();
      expect(agentPolicyReassignLink).not.toBeNull();
    });
    it('hides Agent Policy, View Agent Details and Reassign Policy Links when canAccessFleet RBAC control is NOT enabled', async () => {
      mockUserPrivileges.mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: {
          ...mockInitialUserPrivilegesState().endpointPrivileges,
          canAccessFleet: false,
        },
      });
      await renderAndClickActionsButton();
      const agentPolicyLink = renderResult.queryByTestId('agentPolicyLink');
      const agentDetailsLink = renderResult.queryByTestId('agentDetailsLink');
      const agentPolicyReassignLink = renderResult.queryByTestId('agentPolicyReassignLink');
      expect(agentPolicyLink).toBeNull();
      expect(agentDetailsLink).toBeNull();
      expect(agentPolicyReassignLink).toBeNull();
    });
  });
});
