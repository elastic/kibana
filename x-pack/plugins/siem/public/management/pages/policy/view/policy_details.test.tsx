/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { PolicyDetails } from './policy_details';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { getManagementUrl } from '../../../common/routing';

describe('Policy Details', () => {
  type FindReactWrapperResponse = ReturnType<ReturnType<typeof render>['find']>;

  const policyDetailsPathUrl = getManagementUrl({
    name: 'policyDetails',
    policyId: '1',
    excludePrefix: true,
  });
  const policyListPathUrl = getManagementUrl({ name: 'policyList', excludePrefix: true });
  const policyListPathUrlWithPrefix = getManagementUrl({ name: 'policyList' });
  const sleep = (ms = 100) => new Promise((wakeup) => setTimeout(wakeup, ms));
  const generator = new EndpointDocGenerator();
  const { history, AppWrapper, coreStart } = createAppRootMockRenderer();
  const http = coreStart.http;
  const render = (ui: Parameters<typeof mount>[0]) => mount(ui, { wrappingComponent: AppWrapper });
  let policyDatasource: ReturnType<typeof generator.generatePolicyDatasource>;
  let policyView: ReturnType<typeof render>;

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => {
    if (policyView) {
      policyView.unmount();
    }
  });

  describe('when displayed with invalid id', () => {
    beforeEach(() => {
      http.get.mockReturnValue(Promise.reject(new Error('policy not found')));
      history.push(policyDetailsPathUrl);
      policyView = render(<PolicyDetails />);
    });

    it('should show loader followed by error message', () => {
      expect(policyView.find('EuiLoadingSpinner').length).toBe(1);
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
      policyDatasource = generator.generatePolicyDatasource();
      policyDatasource.id = '1';

      http.get.mockImplementation((...args) => {
        const [path] = args;
        if (typeof path === 'string') {
          // GET datasouce
          if (path === '/api/ingest_manager/datasources/1') {
            asyncActions = asyncActions.then<unknown>(async (): Promise<unknown> => sleep());
            return Promise.resolve({
              item: policyDatasource,
              success: true,
            });
          }

          // GET Agent status for agent config
          if (path === '/api/ingest_manager/fleet/agent-status') {
            asyncActions = asyncActions.then(async () => sleep());
            return Promise.resolve({
              results: { events: 0, total: 5, online: 3, error: 1, offline: 1 },
              success: true,
            });
          }
        }

        return Promise.reject(new Error('unknown API call!'));
      });
      history.push(policyDetailsPathUrl);
      policyView = render(<PolicyDetails />);
    });

    it('should display back to list button and policy title', () => {
      policyView.update();
      const pageHeaderLeft = policyView.find(
        'EuiPageHeaderSection[data-test-subj="pageViewHeaderLeft"]'
      );

      const backToListButton = pageHeaderLeft.find('EuiButtonEmpty');
      expect(backToListButton.prop('iconType')).toBe('arrowLeft');
      expect(backToListButton.prop('href')).toBe(policyListPathUrlWithPrefix);
      expect(backToListButton.text()).toBe('Back to policy list');

      const pageTitle = pageHeaderLeft.find('[data-test-subj="pageViewHeaderLeftTitle"]');
      expect(pageTitle).toHaveLength(1);
      expect(pageTitle.text()).toEqual(policyDatasource.name);
    });
    it('should navigate to list if back to link is clicked', async () => {
      policyView.update();
      const backToListButton = policyView.find(
        'EuiPageHeaderSection[data-test-subj="pageViewHeaderLeft"] EuiButtonEmpty'
      );
      expect(history.location.pathname).toEqual(policyDetailsPathUrl);
      backToListButton.simulate('click', { button: 0 });
      expect(history.location.pathname).toEqual(policyListPathUrl);
    });
    it('should display agent stats', async () => {
      await asyncActions;
      policyView.update();
      const headerRight = policyView.find(
        'EuiPageHeaderSection[data-test-subj="pageViewHeaderRight"]'
      );
      const agentsSummary = headerRight.find('EuiFlexGroup[data-test-subj="policyAgentsSummary"]');
      expect(agentsSummary).toHaveLength(1);
      expect(agentsSummary.text()).toBe('Hosts5Online3Offline1Error1');
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
      expect(history.location.pathname).toEqual(policyListPathUrl);
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
            if (path === '/api/ingest_manager/datasources/1') {
              return Promise.resolve({
                item: policyDatasource,
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
          'This action will update 5 hostsSaving these changes will apply the updates to all active endpoints assigned to this policy'
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
        expect(http.put.mock.calls[0][0]).toEqual(`/api/ingest_manager/datasources/1`);
        policyView.update();

        // Toast notification should be shown
        const toastAddMock = coreStart.notifications.toasts.add.mock;
        expect(toastAddMock.calls).toHaveLength(1);
        expect(toastAddMock.calls[0][0]).toMatchObject({
          color: 'success',
          iconType: 'check',
        });
      });
      it('should show an error notification toast if update fails', async () => {
        policyDatasource.id = 'invalid';
        modalConfirmButton.simulate('click');

        await asyncActions;
        policyView.update();

        // Toast notification should be shown
        const toastAddMock = coreStart.notifications.toasts.add.mock;
        expect(toastAddMock.calls).toHaveLength(1);
        expect(toastAddMock.calls[0][0]).toMatchObject({
          color: 'danger',
          iconType: 'alert',
        });
      });
    });
  });
});
