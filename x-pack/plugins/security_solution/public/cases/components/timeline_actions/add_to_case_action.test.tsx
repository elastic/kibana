/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */
import React from 'react';
import { mount } from 'enzyme';
import { EuiGlobalToastList } from '@elastic/eui';

import { useKibana, useGetUserSavedObjectPermissions } from '../../../common/lib/kibana';
import { useStateToaster } from '../../../common/components/toasters';
import { TestProviders } from '../../../common/mock';
import { AddToCaseAction } from './add_to_case_action';
import { Case } from '../../../../../cases/common';
import { useAllCasesModal } from '../use_all_cases_modal';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/components/toasters', () => {
  const actual = jest.requireActual('../../../common/components/toasters');
  return {
    ...actual,
    useStateToaster: jest.fn(),
  };
});

jest.mock('../use_all_cases_modal');

jest.mock('../all_cases', () => {
  return {
    AllCases: ({ onRowClick }: { onRowClick: (theCase: Partial<Case>) => void }) => {
      return (
        <button
          type="button"
          data-test-subj="all-cases-modal-button"
          onClick={() =>
            onRowClick({
              id: 'selected-case',
              title: 'the selected case',
              settings: { syncAlerts: true },
            })
          }
        >
          {'case-row'}
        </button>
      );
    },
  };
});

describe('AddToCaseAction', () => {
  const props = {
    ecsRowData: {
      _id: 'test-id',
      _index: 'test-index',
      signal: { rule: { id: ['rule-id'], name: ['rule-name'], false_positives: [] } },
    },
  };

  const mockDispatchToaster = jest.fn();
  const mockNavigateToApp = jest.fn();
  const mockCreateCase = jest.fn();
  const mockUseCasesModal = useAllCasesModal as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // mockUseCasesModal.mockReturnValue()
    (useStateToaster as jest.Mock).mockReturnValue([jest.fn(), mockDispatchToaster]);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { navigateToApp: mockNavigateToApp },
        cases: {
          getCreateCase: mockCreateCase,
        },
      },
    });
    (useGetUserSavedObjectPermissions as jest.Mock).mockReturnValue({
      crud: true,
      read: true,
    });
  });

  it('it renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).exists()).toBeTruthy();
  });

  it('it opens the context menu', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="add-new-case-item"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).exists()).toBeTruthy();
  });

  it('it opens the create case modal', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');
    expect(mockCreateCase).toHaveBeenCalled();
  });

  it('it opens the all cases modal', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="all-cases-modal-button"]`).exists()).toBeTruthy();
  });

  it('it set rule information as null when missing', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction
          {...props}
          ecsRowData={{
            _id: 'test-id',
            _index: 'test-index',
            signal: { rule: { id: ['rule-id'], false_positives: [] } },
          }}
        />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');
    console.log('MOCKMOCK', mockCreateCase.mock.calls);
  });

  it('navigates to case view when attach to a new case', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="form-context-on-success"]`).first().simulate('click');

    expect(mockDispatchToaster).toHaveBeenCalled();
    const toast = mockDispatchToaster.mock.calls[0][0].toast;

    const toastWrapper = mount(
      <EuiGlobalToastList toasts={[toast]} toastLifeTimeMs={6000} dismissToast={() => {}} />
    );

    toastWrapper
      .find('[data-test-subj="toaster-content-case-view-link"]')
      .first()
      .simulate('click');

    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/new-case' });
  });

  it('navigates to case view when attach to an existing case', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="all-cases-modal-button"]`).first().simulate('click');

    expect(mockDispatchToaster).toHaveBeenCalled();
    const toast = mockDispatchToaster.mock.calls[0][0].toast;

    const toastWrapper = mount(
      <EuiGlobalToastList toasts={[toast]} toastLifeTimeMs={6000} dismissToast={() => {}} />
    );

    toastWrapper
      .find('[data-test-subj="toaster-content-case-view-link"]')
      .first()
      .simulate('click');

    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolution:case', {
      path: '/selected-case',
    });
  });

  it('disabled when event type is not supported', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction
          {...props}
          ecsRowData={{
            _id: 'test-id',
            _index: 'test-index',
          }}
        />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().prop('disabled')
    ).toBeTruthy();
  });

  it('disabled when user does not have crud permissions', async () => {
    (useGetUserSavedObjectPermissions as jest.Mock).mockReturnValue({
      crud: false,
      read: true,
    });

    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().prop('disabled')
    ).toBeTruthy();
  });
});
