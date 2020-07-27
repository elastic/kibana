/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';

import '../../../common/mock/match_media';
import { AllCases } from '.';
import { TestProviders } from '../../../common/mock';
import { useGetCasesMockState } from '../../containers/mock';
import * as i18n from './translations';

import { getEmptyTagValue } from '../../../common/components/empty_value';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { getCasesColumns } from './columns';

jest.mock('../../containers/use_bulk_update_case');
jest.mock('../../containers/use_delete_cases');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');

const useDeleteCasesMock = useDeleteCases as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useUpdateCasesMock = useUpdateCases as jest.Mock;

jest.mock('../../../common/components/link_to');

describe('AllCases', () => {
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
  const emptyTag = getEmptyTagValue().props.children;

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
    moment.tz.setDefault('UTC');
  });
  it('should render AllCases', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    expect(wrapper.find(`a[data-test-subj="case-details-link"]`).first().prop('href')).toEqual(
      `/${useGetCasesMockState.data.cases[0].id}`
    );
    expect(wrapper.find(`a[data-test-subj="case-details-link"]`).first().text()).toEqual(
      useGetCasesMockState.data.cases[0].title
    );
    expect(
      wrapper.find(`span[data-test-subj="case-table-column-tags-0"]`).first().prop('title')
    ).toEqual(useGetCasesMockState.data.cases[0].tags[0]);
    expect(wrapper.find(`[data-test-subj="case-table-column-createdBy"]`).first().text()).toEqual(
      useGetCasesMockState.data.cases[0].createdBy.fullName
    );
    expect(
      wrapper
        .find(`[data-test-subj="case-table-column-createdAt"]`)
        .first()
        .childAt(0)
        .prop('value')
    ).toBe(useGetCasesMockState.data.cases[0].createdAt);
    expect(wrapper.find(`[data-test-subj="case-table-case-count"]`).first().text()).toEqual(
      'Showing 10 cases'
    );
  });
  it('should render empty fields', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...defaultGetCases,
      data: {
        ...defaultGetCases.data,
        cases: [
          {
            ...defaultGetCases.data.cases[0],
            id: null,
            createdAt: null,
            createdBy: null,
            tags: null,
            title: null,
            totalComment: null,
          },
        ],
      },
    }));
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    const checkIt = (columnName: string, key: number) => {
      const column = wrapper.find('[data-test-subj="cases-table"] tbody .euiTableRowCell').at(key);
      if (columnName === i18n.ACTIONS) {
        return;
      }
      expect(column.find('.euiTableRowCell--hideForDesktop').text()).toEqual(columnName);
      expect(column.find('span').text()).toEqual(emptyTag);
    };
    getCasesColumns([], 'open', false).map((i, key) => i.name != null && checkIt(`${i.name}`, key));
  });

  it('should not render case link or actions on modal=true', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} />
      </TestProviders>
    );
    const checkIt = (columnName: string) => {
      expect(columnName).not.toEqual(i18n.ACTIONS);
    };
    getCasesColumns([], 'open', true).map((i, key) => i.name != null && checkIt(`${i.name}`));
    expect(wrapper.find(`a[data-test-subj="case-details-link"]`).exists()).toBeFalsy();
  });

  it('should tableHeaderSortButton AllCases', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="tableHeaderSortButton"]').first().simulate('click');
    expect(setQueryParams).toBeCalledWith({
      page: 1,
      perPage: 5,
      sortField: 'createdAt',
      sortOrder: 'asc',
    });
  });
  it('closes case when row action icon clicked', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="action-close"]').first().simulate('click');
    const firstCase = useGetCasesMockState.data.cases[0];
    expect(dispatchUpdateCaseProperty).toBeCalledWith({
      caseId: firstCase.id,
      updateKey: 'status',
      updateValue: 'closed',
      refetchCasesStatus: fetchCasesStatus,
      version: firstCase.version,
    });
  });
  it('opens case when row action icon clicked', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: 'closed' },
    }));

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="action-open"]').first().simulate('click');
    const firstCase = useGetCasesMockState.data.cases[0];
    expect(dispatchUpdateCaseProperty).toBeCalledWith({
      caseId: firstCase.id,
      updateKey: 'status',
      updateValue: 'open',
      refetchCasesStatus: fetchCasesStatus,
      version: firstCase.version,
    });
  });
  it('Bulk delete', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...defaultGetCases,
      selectedCases: useGetCasesMockState.data.cases,
    }));
    useDeleteCasesMock
      .mockReturnValueOnce({
        ...defaultDeleteCases,
        isDisplayConfirmDeleteModal: false,
      })
      .mockReturnValue({
        ...defaultDeleteCases,
        isDisplayConfirmDeleteModal: true,
      });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-delete-button"]').first().simulate('click');
    expect(handleToggleModal).toBeCalled();

    wrapper
      .find(
        '[data-test-subj="confirm-delete-case-modal"] [data-test-subj="confirmModalConfirmButton"]'
      )
      .last()
      .simulate('click');
    expect(handleOnDeleteConfirm.mock.calls[0][0]).toStrictEqual(
      useGetCasesMockState.data.cases.map(({ id }) => ({ id }))
    );
  });
  it('Bulk close status update', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...defaultGetCases,
      selectedCases: useGetCasesMockState.data.cases,
    }));

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-close-button"]').first().simulate('click');
    expect(updateBulkStatus).toBeCalledWith(useGetCasesMockState.data.cases, 'closed');
  });
  it('Bulk open status update', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...defaultGetCases,
      selectedCases: useGetCasesMockState.data.cases,
      filterOptions: {
        ...defaultGetCases.filterOptions,
        status: 'closed',
      },
    }));

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-open-button"]').first().simulate('click');
    expect(updateBulkStatus).toBeCalledWith(useGetCasesMockState.data.cases, 'open');
  });
  it('isDeleted is true, refetch', () => {
    useDeleteCasesMock.mockImplementation(() => ({
      ...defaultDeleteCases,
      isDeleted: true,
    }));

    mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    expect(refetchCases).toBeCalled();
    expect(fetchCasesStatus).toBeCalled();
    expect(dispatchResetIsDeleted).toBeCalled();
  });
  it('isUpdated is true, refetch', () => {
    useUpdateCasesMock.mockImplementation(() => ({
      ...defaultUpdateCases,
      isUpdated: true,
    }));

    mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    expect(refetchCases).toBeCalled();
    expect(fetchCasesStatus).toBeCalled();
    expect(dispatchResetIsUpdated).toBeCalled();
  });
});
