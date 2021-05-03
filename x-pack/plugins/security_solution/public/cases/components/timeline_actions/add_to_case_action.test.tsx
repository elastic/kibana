/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EuiGlobalToastList } from '@elastic/eui';

import { useKibana, useGetUserSavedObjectPermissions } from '../../../common/lib/kibana';
import { useStateToaster } from '../../../common/components/toasters';
import { TestProviders } from '../../../common/mock';
import { AddToCaseAction } from './add_to_case_action';
import { basicCase } from '../../../../../cases/public/containers/mock';
import { Case } from '../../../../../cases/common';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to', () => {
  const original = jest.requireActual('../../../common/components/link_to');
  return {
    ...original,
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn(),
      search: '',
    }),
  };
});
jest.mock('../../../common/components/toasters', () => {
  const actual = jest.requireActual('../../../common/components/toasters');
  return {
    ...actual,
    useStateToaster: jest.fn(),
  };
});

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
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
  const mockAllCasesModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToApp = mockNavigateToApp;
    useKibanaMock().services.cases = {
      getAllCases: jest.fn(),
      getCaseView: jest.fn(),
      getConfigureCases: jest.fn(),
      getRecentCases: jest.fn(),
      getCreateCase: mockCreateCase,
      getAllCasesSelectorModal: mockAllCasesModal.mockImplementation(() => <>{'test'}</>),
    };
    (useStateToaster as jest.Mock).mockReturnValue([jest.fn(), mockDispatchToaster]);
    (useGetUserSavedObjectPermissions as jest.Mock).mockReturnValue({
      crud: true,
      read: true,
    });
  });

  it('it renders', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).exists()).toBeTruthy();
  });

  it('it opens the context menu', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="add-new-case-item"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).exists()).toBeTruthy();
  });

  it('it opens the create case modal', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');
    expect(mockCreateCase).toHaveBeenCalled();
  });

  it('it opens the all cases modal', () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');

    expect(mockAllCasesModal.mock.calls[0][0].alertData).toEqual({
      alertId: 'test-id',
      index: 'test-index',
      rule: { id: 'rule-id', name: 'rule-name' },
    });
  });

  it('it set rule information as null when missing', () => {
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
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');
    expect(mockAllCasesModal.mock.calls[0][0].alertData).toEqual({
      alertId: 'test-id',
      index: 'test-index',
      rule: { id: 'rule-id', name: null },
    });
  });

  it('onSuccess triggers toaster that links to case view', () => {
    // @ts-ignore
    useKibanaMock().services.cases.getCreateCase = ({
      onSuccess,
    }: {
      onSuccess: (theCase: Case) => Promise<void>;
    }) => {
      onSuccess(basicCase);
    };
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');

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
      path: '/basic-case-id',
    });
  });

  it('disabled when event type is not supported', () => {
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
      wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });

  it('disabled when user does not have crud permissions', () => {
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
      wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });
});
