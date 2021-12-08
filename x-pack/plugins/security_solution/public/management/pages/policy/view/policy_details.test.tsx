/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { PolicyDetails } from './policy_details';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { getPolicyDetailPath, getEndpointListPath } from '../../../common/routing';
import { policyListApiPathHandlers } from '../store/test_mock_utils';

jest.mock('./policy_forms/components/policy_form_layout');

describe('Policy Details', () => {
  const policyDetailsPathUrl = getPolicyDetailPath('1');
  const endpointListPath = getEndpointListPath({ name: 'endpointList' });
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));
  const generator = new EndpointDocGenerator();
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];
  let http: typeof coreStart.http;
  let render: (ui: Parameters<typeof mount>[0]) => ReturnType<typeof mount>;
  let policyPackagePolicy: ReturnType<typeof generator.generatePolicyPackagePolicy>;
  let policyView: ReturnType<typeof render>;

  beforeEach(() => {
    const appContextMockRenderer = createAppRootMockRenderer();
    const AppWrapper = appContextMockRenderer.AppWrapper;

    ({ history, coreStart, middlewareSpy } = appContextMockRenderer);
    render = (ui) => mount(ui, { wrappingComponent: AppWrapper });
    http = coreStart.http;
  });

  describe('when displayed with invalid id', () => {
    let releaseApiFailure: () => void;

    beforeEach(() => {
      http.get.mockImplementation(async () => {
        await new Promise((_, reject) => {
          releaseApiFailure = reject.bind(null, new Error('policy not found'));
        });
      });
      history.push(policyDetailsPathUrl);
      policyView = render(<PolicyDetails />);
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
          if (path === '/api/fleet/package_policies/1') {
            asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
            return Promise.resolve({
              item: policyPackagePolicy,
              success: true,
            });
          }

          // GET Agent status for agent policy
          if (path === '/api/fleet/agent_status') {
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
      policyView = render(<PolicyDetails />);
    });

    it('should NOT display timeline', async () => {
      expect(policyView.find('flyoutOverlay')).toHaveLength(0);
    });

    it('should display back to list button and policy title', () => {
      policyView.update();

      const backToListLink = policyView.find('BackToExternalAppButton');
      expect(backToListLink.prop('backButtonUrl')).toBe(`/app/security${endpointListPath}`);
      expect(backToListLink.text()).toBe('Back to endpoint hosts');

      const pageTitle = policyView.find('span[data-test-subj="header-page-title"]');
      expect(pageTitle).toHaveLength(1);
      expect(pageTitle.text()).toEqual(policyPackagePolicy.name);
    });
    it('should navigate to list if back to link is clicked', async () => {
      policyView.update();

      const backToListLink = policyView.find('a[data-test-subj="policyDetailsBackLink"]');
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      backToListLink.simulate('click', { button: 0 });
      expect(history.location.pathname).toEqual(endpointListPath);
    });
    it('should display agent stats', async () => {
      await asyncActions;
      policyView.update();

      const agentsSummary = policyView.find('EuiFlexGroup[data-test-subj="policyAgentsSummary"]');
      expect(agentsSummary).toHaveLength(1);
      expect(agentsSummary.text()).toBe('Total agents5Healthy3Unhealthy1Offline1');
    });
  });
});
