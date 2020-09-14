/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { PolicyDetails } from './policy_details';
import '../../../../common/mock/match_media.ts';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { getPolicyDetailPath, getEndpointListPath } from '../../../common/routing';
import { policyListApiPathHandlers } from '../store/policy_list/test_mock_utils';

jest.mock('../../../../common/components/link_to');

describe('Policy Details', () => {
  type FindReactWrapperResponse = ReturnType<ReturnType<typeof render>['find']>;

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

  afterEach(() => {
    if (policyView) {
      policyView.unmount();
    }
    jest.clearAllMocks();
  });

  describe('when displayed with invalid id', () => {
    let releaseApiFailure: () => void;
    beforeEach(() => {
      http.get.mockImplementationOnce(async () => {
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
          if (path === '/api/ingest_manager/package_policies/1') {
            asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
            return Promise.resolve({
              item: policyPackagePolicy,
              success: true,
            });
          }

          // GET Agent status for agent policy
          if (path === '/api/ingest_manager/fleet/agent-status') {
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

      const backToListLink = policyView.find('LinkIcon[dataTestSubj="policyDetailsBackLink"]');
      expect(backToListLink.prop('iconType')).toBe('arrowLeft');
      expect(backToListLink.prop('href')).toBe(endpointListPath);
      expect(backToListLink.text()).toBe('Back to endpoint hosts');

      const pageTitle = policyView.find('h1[data-test-subj="header-page-title"]');
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
      expect(agentsSummary.text()).toBe('Endpoints5Online3Offline1Error1');
    });
    it('should display cancel button', async () => {
      await asyncActions;
      policyView.update();
      const cancelbutton = policyView.find(
        'EuiButtonEmpty[data-test-subj="policyDetailsCancelButton"]'
      );
      expect(cancelbutton).toHaveLength(1);
      expect(cancelbutton.text()).toEqual('Cancel');
    });
    it('should redirect to policy list when cancel button is clicked', async () => {
      await asyncActions;
      policyView.update();
      const cancelbutton = policyView.find(
        'EuiButtonEmpty[data-test-subj="policyDetailsCancelButton"]'
      );
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      cancelbutton.simulate('click', { button: 0 });
      const navigateToAppMockedCalls = coreStart.application.navigateToApp.mock.calls;
      expect(navigateToAppMockedCalls[navigateToAppMockedCalls.length - 1]).toEqual([
        'securitySolution:administration',
        { path: endpointListPath },
      ]);
    });
    it('should display save button', async () => {
      await asyncActions;
      policyView.update();
      const saveButton = policyView.find('EuiButton[data-test-subj="policyDetailsSaveButton"]');
      expect(saveButton).toHaveLength(1);
      expect(saveButton.text()).toEqual('Save');
    });
    describe('when the save button is clicked', () => {
      let saveButton: FindReactWrapperResponse;
      let confirmModal: FindReactWrapperResponse;
      let modalCancelButton: FindReactWrapperResponse;
      let modalConfirmButton: FindReactWrapperResponse;

      beforeEach(async () => {
        await asyncActions;
        policyView.update();
        saveButton = policyView.find('EuiButton[data-test-subj="policyDetailsSaveButton"]');
        saveButton.simulate('click');
        policyView.update();
        confirmModal = policyView.find(
          'EuiConfirmModal[data-test-subj="policyDetailsConfirmModal"]'
        );
        modalCancelButton = confirmModal.find('button[data-test-subj="confirmModalCancelButton"]');
        modalConfirmButton = confirmModal.find(
          'button[data-test-subj="confirmModalConfirmButton"]'
        );
        http.put.mockImplementation((...args) => {
          asyncActions = asyncActions.then(async () => sleep());
          const [path] = args;
          if (typeof path === 'string') {
            if (path === '/api/ingest_manager/package_policies/1') {
              return Promise.resolve({
                item: policyPackagePolicy,
                success: true,
              });
            }
          }

          return Promise.reject(new Error('unknown PUT path!'));
        });
      });

      it('should show a modal confirmation', () => {
        expect(confirmModal).toHaveLength(1);
        expect(confirmModal.find('div[data-test-subj="confirmModalTitleText"]').text()).toEqual(
          'Save and deploy changes'
        );
        expect(modalCancelButton.text()).toEqual('Cancel');
        expect(modalConfirmButton.text()).toEqual('Save and deploy changes');
      });
      it('should show info callout if policy is in use', () => {
        const warningCallout = confirmModal.find(
          'EuiCallOut[data-test-subj="policyDetailsWarningCallout"]'
        );
        expect(warningCallout).toHaveLength(1);
        expect(warningCallout.text()).toEqual(
          'This action will update 5 hostsSaving these changes will apply updates to all endpoints assigned to this agent policy.'
        );
      });
      it('should close dialog if cancel button is clicked', () => {
        modalCancelButton.simulate('click');
        expect(
          policyView.find('EuiConfirmModal[data-test-subj="policyDetailsConfirmModal"]')
        ).toHaveLength(0);
      });
      it('should update policy and show success notification when confirm button is clicked', async () => {
        modalConfirmButton.simulate('click');
        policyView.update();
        // Modal should be closed
        expect(
          policyView.find('EuiConfirmModal[data-test-subj="policyDetailsConfirmModal"]')
        ).toHaveLength(0);

        // API should be called
        await asyncActions;
        expect(http.put.mock.calls[0][0]).toEqual(`/api/ingest_manager/package_policies/1`);
        policyView.update();

        // Toast notification should be shown
        const toastAddMock = coreStart.notifications.toasts.addSuccess.mock;
        expect(toastAddMock.calls).toHaveLength(1);
        expect(toastAddMock.calls[0][0]).toMatchObject({
          title: 'Success!',
          text: expect.any(Function),
        });
      });
      it('should show an error notification toast if update fails', async () => {
        policyPackagePolicy.id = 'invalid';
        modalConfirmButton.simulate('click');

        await asyncActions;
        policyView.update();

        // Toast notification should be shown
        const toastAddMock = coreStart.notifications.toasts.addDanger.mock;
        expect(toastAddMock.calls).toHaveLength(1);
        expect(toastAddMock.calls[0][0]).toMatchObject({
          title: 'Failed!',
          text: expect.any(String),
        });
      });
    });
  });
});
