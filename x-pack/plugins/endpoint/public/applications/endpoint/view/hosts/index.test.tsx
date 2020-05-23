/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { AppAction } from '../../types';
import { HostList } from './index';
import {
  mockHostDetailsApiResult,
  mockHostResultList,
} from '../../store/hosts/mock_host_result_list';
import { AppContextTestRender, createAppRootMockRenderer } from '../../mocks';
import { HostInfo, HostStatus, HostPolicyResponseActionStatus } from '../../../../../common/types';
import { EndpointDocGenerator } from '../../../../../common/generate_data';

describe('when on the hosts page', () => {
  const docGenerator = new EndpointDocGenerator();
  let render: () => ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];

  beforeEach(async () => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store, coreStart, middlewareSpy } = mockedContext);
    render = () => mockedContext.render(<HostList />);
  });

  it('should show a table', async () => {
    const renderResult = render();
    const table = await renderResult.findByTestId('hostListTable');
    expect(table).not.toBeNull();
  });

  describe('when there is no selected host in the url', () => {
    it('should not show the flyout', () => {
      const renderResult = render();
      expect.assertions(1);
      return renderResult.findByTestId('hostDetailsFlyout').catch(e => {
        expect(e).not.toBeNull();
      });
    });
    describe('when list data loads', () => {
      beforeEach(() => {
        reactTestingLibrary.act(() => {
          const hostListData = mockHostResultList({ total: 3 });
          [HostStatus.ERROR, HostStatus.ONLINE, HostStatus.OFFLINE].forEach((status, index) => {
            hostListData.hosts[index] = {
              metadata: hostListData.hosts[index].metadata,
              host_status: status,
            };
          });
          const action: AppAction = {
            type: 'serverReturnedHostList',
            payload: hostListData,
          };
          store.dispatch(action);
        });
      });

      it('should display rows in the table', async () => {
        const renderResult = render();
        const rows = await renderResult.findAllByRole('row');
        expect(rows).toHaveLength(4);
      });
      it('should show total', async () => {
        const renderResult = render();
        const total = await renderResult.findByTestId('hostListTableTotal');
        expect(total.textContent).toEqual('3 Hosts');
      });
      it('should display correct status', async () => {
        const renderResult = render();
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
      });

      describe('when the user clicks the first hostname in the table', () => {
        let renderResult: reactTestingLibrary.RenderResult;
        beforeEach(async () => {
          const hostDetailsApiResponse = mockHostDetailsApiResult();

          coreStart.http.get.mockReturnValue(Promise.resolve(hostDetailsApiResponse));
          reactTestingLibrary.act(() => {
            store.dispatch({
              type: 'serverReturnedHostDetails',
              payload: hostDetailsApiResponse,
            });
          });

          renderResult = render();
          const hostNameLinks = await renderResult.findAllByTestId('hostnameCellLink');
          if (hostNameLinks.length) {
            reactTestingLibrary.fireEvent.click(hostNameLinks[0]);
          }
        });

        it('should show the flyout', () => {
          return renderResult.findByTestId('hostDetailsFlyout').then(flyout => {
            expect(flyout).not.toBeNull();
          });
        });
      });
    });
  });

  describe('when there is a selected host in the url', () => {
    let hostDetails: HostInfo;
    const dispatchServerReturnedHostPolicyResponse = (
      overallStatus: HostPolicyResponseActionStatus = HostPolicyResponseActionStatus.success
    ) => {
      const policyResponse = docGenerator.generatePolicyResponse();
      policyResponse.endpoint.policy.applied.status = overallStatus;
      store.dispatch({
        type: 'serverReturnedHostPolicyResponse',
        payload: {
          policy_response: policyResponse,
        },
      });
    };

    beforeEach(() => {
      const {
        host_status,
        metadata: { host, ...details },
      } = mockHostDetailsApiResult();
      hostDetails = {
        host_status,
        metadata: {
          ...details,
          host: {
            ...host,
            id: '1',
          },
        },
      };

      coreStart.http.get.mockReturnValue(Promise.resolve(hostDetails));
      coreStart.application.getUrlForApp.mockReturnValue('/app/logs');

      reactTestingLibrary.act(() => {
        history.push({
          ...history.location,
          search: '?selected_host=1',
        });
      });
      reactTestingLibrary.act(() => {
        store.dispatch({
          type: 'serverReturnedHostDetails',
          payload: hostDetails,
        });
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should show the flyout', () => {
      const renderResult = render();
      return renderResult.findByTestId('hostDetailsFlyout').then(flyout => {
        expect(flyout).not.toBeNull();
      });
    });
    it('should display policy status value as a link', async () => {
      const renderResult = render();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink).not.toBeNull();
      expect(policyStatusLink.getAttribute('href')).toEqual(
        '?page_index=0&page_size=10&selected_host=1&show=policy_response'
      );
    });
    it('should update the URL when policy status link is clicked', async () => {
      const renderResult = render();
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
      reactTestingLibrary.act(() => {
        fireEvent.click(policyStatusLink);
      });
      const changedUrlAction = await userChangedUrlChecker;
      expect(changedUrlAction.payload.search).toEqual(
        '?page_index=0&page_size=10&selected_host=1&show=policy_response'
      );
    });
    it('should display Success overall policy status', async () => {
      const renderResult = render();
      reactTestingLibrary.act(() => {
        dispatchServerReturnedHostPolicyResponse(HostPolicyResponseActionStatus.success);
      });
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Success');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="success"]')
      ).not.toBeNull();
    });
    it('should display Warning overall policy status', async () => {
      const renderResult = render();
      reactTestingLibrary.act(() => {
        dispatchServerReturnedHostPolicyResponse(HostPolicyResponseActionStatus.warning);
      });
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Warning');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="warning"]')
      ).not.toBeNull();
    });
    it('should display Failed overall policy status', async () => {
      const renderResult = render();
      reactTestingLibrary.act(() => {
        dispatchServerReturnedHostPolicyResponse(HostPolicyResponseActionStatus.failure);
      });
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Failed');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="danger"]')
      ).not.toBeNull();
    });
    it('should display Unknown overall policy status', async () => {
      const renderResult = render();
      reactTestingLibrary.act(() => {
        dispatchServerReturnedHostPolicyResponse('' as HostPolicyResponseActionStatus);
      });
      const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
      expect(policyStatusLink.textContent).toEqual('Unknown');

      const policyStatusHealth = await renderResult.findByTestId('policyStatusHealth');
      expect(
        policyStatusHealth.querySelector('[data-euiicon-type][color="subdued"]')
      ).not.toBeNull();
    });
    it('should include the link to logs', async () => {
      const renderResult = render();
      const linkToLogs = await renderResult.findByTestId('hostDetailsLinkToLogs');
      expect(linkToLogs).not.toBeNull();
      expect(linkToLogs.textContent).toEqual('Endpoint Logs');
      expect(linkToLogs.getAttribute('href')).toEqual(
        "/app/logs/stream?logFilter=(expression:'host.id:1',kind:kuery)"
      );
    });
    describe('when link to logs is clicked', () => {
      beforeEach(async () => {
        const renderResult = render();
        const linkToLogs = await renderResult.findByTestId('hostDetailsLinkToLogs');
        reactTestingLibrary.act(() => {
          fireEvent.click(linkToLogs);
        });
      });

      it('should navigate to logs without full page refresh', () => {
        expect(coreStart.application.navigateToApp.mock.calls).toHaveLength(1);
      });
    });
    describe('when showing host Policy Response panel', () => {
      let renderResult: ReturnType<typeof render>;
      beforeEach(async () => {
        renderResult = render();
        const policyStatusLink = await renderResult.findByTestId('policyStatusValue');
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          fireEvent.click(policyStatusLink);
        });
        await userChangedUrlChecker;
      });
      it('should hide the host details panel', async () => {
        const hostDetailsFlyout = await renderResult.queryByTestId('hostDetailsFlyoutBody');
        expect(hostDetailsFlyout).toBeNull();
      });
      it('should display policy response sub-panel', async () => {
        expect(
          await renderResult.findByTestId('hostDetailsPolicyResponseFlyoutHeader')
        ).not.toBeNull();
        expect(
          await renderResult.findByTestId('hostDetailsPolicyResponseFlyoutBody')
        ).not.toBeNull();
      });
      it('should include the sub-panel title', async () => {
        expect(
          (await renderResult.findByTestId('hostDetailsPolicyResponseFlyoutTitle')).textContent
        ).toBe('Policy Response');
      });
      it('should include the back to details link', async () => {
        const subHeaderBackLink = await renderResult.findByTestId('flyoutSubHeaderBackButton');
        expect(subHeaderBackLink.textContent).toBe('Endpoint Details');
        expect(subHeaderBackLink.getAttribute('href')).toBe(
          '?page_index=0&page_size=10&selected_host=1'
        );
      });
      it('should update URL when back to details link is clicked', async () => {
        const subHeaderBackLink = await renderResult.findByTestId('flyoutSubHeaderBackButton');
        const userChangedUrlChecker = middlewareSpy.waitForAction('userChangedUrl');
        reactTestingLibrary.act(() => {
          fireEvent.click(subHeaderBackLink);
        });
        const changedUrlAction = await userChangedUrlChecker;
        expect(changedUrlAction.payload.search).toEqual(
          '?page_index=0&page_size=10&selected_host=1'
        );
      });
    });
  });
});
