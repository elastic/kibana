/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import React from 'react';
import '../../../common/mock/match_media';
import { AllCasesModal } from '.';
import { TestProviders } from '../../../common/mock';

import { useGetCasesMockState, basicCaseId } from '../../containers/mock';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { EuiTableRow } from '@elastic/eui';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../common/components/link_to');

jest.mock('../../containers/use_bulk_update_case');
jest.mock('../../containers/use_delete_cases');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');

const useDeleteCasesMock = useDeleteCases as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useUpdateCasesMock = useUpdateCases as jest.Mock;
jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const onCloseCaseModal = jest.fn();
const onRowClick = jest.fn();
const defaultProps = {
  onCloseCaseModal,
  onRowClick,
  showCaseModal: true,
};
describe('AllCasesModal', () => {
  const dispatchResetIsDeleted = jest.fn();
  const dispatchResetIsUpdated = jest.fn();
  const dispatchUpdateCaseProperty = jest.fn();
  const handleOnDeleteConfirm = jest.fn();
  const handleToggleModal = jest.fn();
  const refetchCases = jest.fn();
  const setFilters = jest.fn();
  const setQueryParams = jest.fn();
  const setSelectedCases = jest.fn();
  const updateBulkStatus = jest.fn();
  const fetchCasesStatus = jest.fn();

  const defaultGetCases = {
    ...useGetCasesMockState,
    dispatchUpdateCaseProperty,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  };
  const defaultDeleteCases = {
    dispatchResetIsDeleted,
    handleOnDeleteConfirm,
    handleToggleModal,
    isDeleted: false,
    isDisplayConfirmDeleteModal: false,
    isLoading: false,
  };
  const defaultCasesStatus = {
    countClosedCases: 0,
    countOpenCases: 5,
    fetchCasesStatus,
    isError: false,
    isLoading: true,
  };
  const defaultUpdateCases = {
    isUpdated: false,
    isLoading: false,
    isError: false,
    dispatchResetIsUpdated,
    updateBulkStatus,
  };
  /* eslint-disable no-console */
  // Silence until enzyme fixed to use ReactTestUtils.act()
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  /* eslint-enable no-console */
  beforeEach(() => {
    jest.resetAllMocks();
    useUpdateCasesMock.mockImplementation(() => defaultUpdateCases);
    useGetCasesMock.mockImplementation(() => defaultGetCases);
    useDeleteCasesMock.mockImplementation(() => defaultDeleteCases);
    useGetCasesStatusMock.mockImplementation(() => defaultCasesStatus);
  });

  it('renders with unselectable rows', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeTruthy();
    expect(wrapper.find(EuiTableRow).first().prop('isSelectable')).toBeFalsy();
  });
  it('does not render modal if showCaseModal: false', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...{ ...defaultProps, showCaseModal: false }} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeFalsy();
  });
  it('onRowClick called when row is clicked', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );
    const firstRow = wrapper.find(EuiTableRow).first();
    firstRow.simulate('click');
    expect(onRowClick.mock.calls[0][0]).toEqual(basicCaseId);
  });
  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );
    const modalClose = wrapper.find('.euiModal__closeIcon').first();
    modalClose.simulate('click');
    expect(onCloseCaseModal).toBeCalled();
  });
});
