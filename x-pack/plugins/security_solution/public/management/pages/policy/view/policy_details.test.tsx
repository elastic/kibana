/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { AGENT_API_ROUTES, PACKAGE_POLICY_API_ROOT } from '@kbn/fleet-plugin/common';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { getEndpointListPath, getPoliciesPath, getPolicyDetailPath } from '../../../common/routing';
import { getHostIsolationExceptionItems } from '../../host_isolation_exceptions/service';
import { policyListApiPathHandlers } from '../store/test_mock_utils';
import { PolicyDetails } from './policy_details';
import { APP_UI_ID } from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('./policy_forms/components/policy_form_layout');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../host_isolation_exceptions/service');
jest.mock('../../../../common/hooks/use_experimental_features');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;
const useIsExperimentalFeatureMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('Policy Details', () => {
  const policyDetailsPathUrl = getPolicyDetailPath('1');
  const policyListPath = getPoliciesPath();
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));
  const generator = new EndpointDocGenerator();
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let http: typeof coreStart.http;
  let render: () => ReturnType<typeof mount>;
  let policyPackagePolicy: ReturnType<typeof generator.generatePolicyPackagePolicy>;
  let policyView: ReturnType<typeof render>;

  beforeEach(() => {
    const appContextMockRenderer = createAppRootMockRenderer();
    const AppWrapper = appContextMockRenderer.AppWrapper;

    ({ history, coreStart, middlewareSpy } = appContextMockRenderer);
    render = () => mount(<PolicyDetails />, { wrappingComponent: AppWrapper });
    http = coreStart.http;
  });

  describe('when displayed with invalid id', () => {
    let releaseApiFailure: () => void;

    beforeEach(() => {
      useIsExperimentalFeatureMock.mockReturnValue({
        policyListEnabled: true,
      });
      http.get.mockImplementation(async () => {
        await new Promise((_, reject) => {
          releaseApiFailure = reject.bind(null, new Error('policy not found'));
        });
      });
      history.push(policyDetailsPathUrl);
      policyView = render();
    });

    it('should NOT display timeline', async () => {
      expect(policyView.find('flyoutOverlay')).toHaveLength(0);
    });

    it('should show loader followed by error message', async () => {
      expect(policyView.find('EuiLoadingSpinner').length).toBe(1);
      releaseApiFailure();
      await middlewareSpy.waitForAction('serverFailedToReturnPolicyDetailsData');
      policyView.update();
      const callout = policyView.find('EuiCallOut');
      expect(callout).toHaveLength(1);
      expect(callout.prop('color')).toEqual('danger');
      expect(callout.text()).toEqual('policy not found');
    });
  });

  describe('when displayed with valid id', () => {
    let asyncActions: Promise<unknown> = Promise.resolve();

    beforeEach(() => {
      policyPackagePolicy = generator.generatePolicyPackagePolicy();
      policyPackagePolicy.id = '1';

      const policyListApiHandlers = policyListApiPathHandlers();

      http.get.mockImplementation((...args) => {
        const [path] = args;
        if (typeof path === 'string') {
          // GET datasouce
          if (path === `${PACKAGE_POLICY_API_ROOT}/1`) {
            asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
            return Promise.resolve({
              item: policyPackagePolicy,
              success: true,
            });
          }

          // GET Agent status for agent policy
          if (path === `${AGENT_API_ROUTES.STATUS_PATTERN}`) {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve({
              results: { events: 0, total: 5, online: 3, error: 1, offline: 1 },
              success: true,
            });
          }

          // Get package data
          // Used in tests that route back to the list
          if (policyListApiHandlers[path]) {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve(policyListApiHandlers[path]());
          }
        }

        return Promise.reject(new Error(`unknown API call (not MOCKED): ${path}`));
      });
      history.push(policyDetailsPathUrl);
    });

    it('should NOT display timeline', async () => {
      policyView = render();
      await asyncActions;
      expect(policyView.find('flyoutOverlay')).toHaveLength(0);
    });

    it('should display back to policy list button and policy title', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const backToListLink = policyView.find('BackToExternalAppButton');
      expect(backToListLink.prop('backButtonUrl')).toBe(`/app/security${policyListPath}`);
      expect(backToListLink.text()).toBe('Back to policy list');

      const pageTitle = policyView.find('span[data-test-subj="header-page-title"]');
      expect(pageTitle).toHaveLength(1);
      expect(pageTitle.text()).toEqual(policyPackagePolicy.name);
    });

    it('should navigate to list if back to link is clicked', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const backToListLink = policyView.find('a[data-test-subj="policyDetailsBackLink"]');
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      backToListLink.simulate('click', { button: 0 });
      expect(history.location.pathname).toEqual(policyListPath);
    });

    it('should display and navigate to custom back button if non-default backLink state is present', async () => {
      const customBackLinkState = {
        backLink: {
          navigateTo: [
            APP_UI_ID,
            {
              path: getEndpointListPath({ name: 'endpointList' }),
            },
          ],
          label: 'View all endpoints',
          href: '/app/security/administration/endpoints',
        },
      };

      history.push({ pathname: policyDetailsPathUrl, state: customBackLinkState });
      policyView = render();
      await asyncActions;
      policyView.update();

      const backToListLink = policyView.find('BackToExternalAppButton');
      expect(backToListLink.prop('backButtonUrl')).toBe(`/app/security/administration/endpoints`);
      expect(backToListLink.text()).toBe('View all endpoints');
    });

    it('should display agent stats', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const agentsSummary = policyView.find('EuiFlexGroup[data-test-subj="policyAgentsSummary"]');
      expect(agentsSummary).toHaveLength(1);
      expect(agentsSummary.text()).toBe('Total agents5Healthy3Unhealthy1Offline1');
    });

    it('should display event filters tab', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();

      const eventFiltersTab = policyView.find('button#eventFilters');
      expect(eventFiltersTab).toHaveLength(1);
      expect(eventFiltersTab.text()).toBe('Event filters');
    });

    it('should display the host isolation exceptions tab', async () => {
      policyView = render();
      await asyncActions;
      policyView.update();
      const tab = policyView.find('button#hostIsolationExceptions');
      expect(tab).toHaveLength(1);
      expect(tab.text()).toBe('Host isolation exceptions');
    });

    describe('without canIsolateHost permissions', () => {
      beforeEach(() => {
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: {
            loading: false,
            canIsolateHost: false,
          },
        });
      });

      it('should not display the host isolation exceptions tab with no privileges and no assigned exceptions', async () => {
        getHostIsolationExceptionItemsMock.mockReturnValue({ total: 0, data: [] });
        policyView = render();
        await asyncActions;
        policyView.update();
        await waitFor(() => {
          expect(getHostIsolationExceptionItemsMock).toHaveBeenCalled();
        });
        expect(policyView.find('button#hostIsolationExceptions')).toHaveLength(0);
      });

      it('should not display the host isolation exceptions tab with no privileges and no data', async () => {
        getHostIsolationExceptionItemsMock.mockReturnValue({ total: 0 });
        policyView = render();
        await asyncActions;
        policyView.update();
        await waitFor(() => {
          expect(getHostIsolationExceptionItemsMock).toHaveBeenCalled();
        });
        expect(policyView.find('button#hostIsolationExceptions')).toHaveLength(0);
      });

      it('should display the host isolation exceptions tab with no privileges if there are assigned exceptions', async () => {
        // simulate existing assigned policies
        getHostIsolationExceptionItemsMock.mockReturnValue(getFoundExceptionListItemSchemaMock(1));
        policyView = render();
        await asyncActions;
        policyView.update();
        await waitFor(() => {
          expect(getHostIsolationExceptionItemsMock).toHaveBeenCalled();
        });
        expect(policyView.find('button#hostIsolationExceptions')).toHaveLength(1);
      });
    });
  });
});
